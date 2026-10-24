# Ishara stylized rigged avatar generator for Blender
# Usage: Open Blender > Scripting > New > paste this script > Run Script.
# It builds a simple full-body stylized character with articulated finger bones
# and exports /tmp/ishara_avatar.glb (change EXPORT_PATH below if desired).

import bpy
import math
from mathutils import Vector

EXPORT_PATH = bpy.path.abspath("//ishara_avatar.glb")

# Start clean
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.armatures, bpy.data.materials):
    pass

def mat(name, color, roughness=0.72):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    return m

skin = mat("Warm skin", (0.78, 0.48, 0.29))
hair = mat("Dark brown hair", (0.105, 0.045, 0.028))
blue = mat("Light blue sweater", (0.19, 0.43, 0.72))
cream = mat("Cream trousers", (0.86, 0.81, 0.69))
shoe_mat = mat("Cream shoes", (0.91, 0.87, 0.78))
white = mat("Eye whites", (0.98, 0.96, 0.91))
dark = mat("Eyes and brows", (0.055, 0.025, 0.018))
mouth_mat = mat("Smile", (0.22, 0.035, 0.045))

# Each body part is its own smooth object, weighted fully to one bone.
parts = []
def uv(name, loc, scale, material, bone=None, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    for poly in o.data.polygons: poly.use_smooth = True
    parts.append((o, bone))
    return o

def capsule(name, a, b, radius, material, bone=None):
    a, b = Vector(a), Vector(b)
    mid = (a+b)/2
    direction = b-a
    o = uv(name, mid, (radius, radius, direction.length/2 + radius*0.35), material, bone)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = Vector((0,0,1)).rotation_difference(direction.normalized())
    return o

# Character scale: feet near z=0, head near z=3.25.
# Torso and clothing
uv("Sweater torso", (0,0,1.93), (0.48,0.29,0.62), blue, "spine")
uv("Neck", (0,0,2.57), (0.16,0.15,0.20), skin, "neck")
uv("Head", (0,-0.015,2.91), (0.39,0.32,0.47), skin, "head")
# Hair cap and side locks
uv("Hair cap", (0,0.055,3.12), (0.43,0.34,0.34), hair, "head")
uv("Hair left wave", (-0.34,0.045,2.91), (0.17,0.22,0.38), hair, "head")
uv("Hair right wave", (0.34,0.045,2.94), (0.17,0.22,0.39), hair, "head")
uv("Hair back", (0,0.17,2.88), (0.39,0.20,0.42), hair, "head")
# Face features: forward is negative Y
uv("Left eye white", (-0.145,-0.303,2.98), (0.075,0.035,0.105), white, "head")
uv("Right eye white", (0.145,-0.303,2.98), (0.075,0.035,0.105), white, "head")
uv("Left pupil", (-0.145,-0.337,2.98), (0.038,0.022,0.065), dark, "head")
uv("Right pupil", (0.145,-0.337,2.98), (0.038,0.022,0.065), dark, "head")
uv("Left eyebrow", (-0.145,-0.30,3.13), (0.095,0.025,0.025), hair, "head")
uv("Right eyebrow", (0.145,-0.30,3.13), (0.095,0.025,0.025), hair, "head")
uv("Nose", (0,-0.345,2.88), (0.045,0.045,0.055), skin, "head")
uv("Smile", (0,-0.303,2.79), (0.105,0.025,0.045), mouth_mat, "head")
# Ears
uv("Left ear", (-0.405,0,2.91), (0.085,0.09,0.13), skin, "head")
uv("Right ear", (0.405,0,2.91), (0.085,0.09,0.13), skin, "head")
# Waist, trousers and legs
uv("Trousers waist", (0,0,1.24), (0.39,0.26,0.23), cream, "hips")
capsule("Left trouser leg", (-0.19,0,1.22), (-0.20,0,0.38), 0.17, cream, "left_leg")
capsule("Right trouser leg", (0.19,0,1.22), (0.20,0,0.38), 0.17, cream, "right_leg")
uv("Left shoe", (-0.20,-0.07,0.20), (0.19,0.29,0.12), shoe_mat, "left_foot")
uv("Right shoe", (0.20,-0.07,0.20), (0.19,0.29,0.12), shoe_mat, "right_foot")

# Arms, hands and fingers. Arms slightly out from body.
for side, s in (("left",-1), ("right",1)):
    shoulder = (s*0.43, 0, 2.30)
    elbow = (s*0.62, -0.005, 1.78)
    wrist = (s*0.70, -0.035, 1.43)
    capsule(side+" sweater upper arm", shoulder, elbow, 0.17, blue, side+"_upper_arm")
    capsule(side+" sweater forearm", elbow, wrist, 0.145, blue, side+"_forearm")
    uv(side+" hand palm", (s*0.72,-0.055,1.30), (0.13,0.075,0.16), skin, side+"_hand")
    # fingers spread downward/outward in a relaxed open hand
    # finger roots around palm; individual 2-segment bones will be created below
    finger_specs = [
        ("thumb", -0.13, -0.02, -0.08),
        ("index", -0.075, -0.17, -0.20),
        ("middle", -0.025, -0.20, -0.24),
        ("ring", 0.03, -0.18, -0.22),
        ("little", 0.08, -0.13, -0.17),
    ]
    for fname, dx, dz, length in finger_specs:
        # Mirror x placement for the other hand; fingers are visible as separate pieces.
        x0 = s*0.72 + s*dx
        z0 = 1.23 + dz*0.15
        x1 = x0 + s*dx*0.55
        z1 = z0 + length*0.48
        x2 = x1 + s*dx*0.35
        z2 = z1 + length*0.52
        bone1 = f"{side}_{fname}_1"
        bone2 = f"{side}_{fname}_2"
        capsule(side+" "+fname+" proximal", (x0,-0.065,z0), (x1,-0.065,z1), 0.027 if fname != "thumb" else 0.035, skin, bone1)
        capsule(side+" "+fname+" distal", (x1,-0.065,z1), (x2,-0.065,z2), 0.023 if fname != "thumb" else 0.03, skin, bone2)

# Build armature with a sensible hierarchy and articulated finger bones.
arm_data = bpy.data.armatures.new("Ishara humanoid skeleton")
arm = bpy.data.objects.new("Ishara_Rig", arm_data)
bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones

def bone(name, head, tail, parent=None, connected=False):
    b = eb.new(name)
    b.head = head
    b.tail = tail
    if parent: b.parent = eb[parent]
    b.use_connect = connected
    return b

bone("root", (0,0,0.12), (0,0,0.45))
bone("hips", (0,0,0.95), (0,0,1.30), "root")
bone("spine", (0,0,1.30), (0,0,2.35), "hips")
bone("neck", (0,0,2.35), (0,0,2.68), "spine")
bone("head", (0,0,2.68), (0,0,3.20), "neck")
for side,s in (("left",-1),("right",1)):
    bone(side+"_upper_arm",(s*0.40,0,2.31),(s*0.61,0,1.80),"spine")
    bone(side+"_forearm",(s*0.61,0,1.80),(s*0.70,-0.035,1.43),side+"_upper_arm")
    bone(side+"_hand",(s*0.70,-0.035,1.43),(s*0.72,-0.055,1.24),side+"_forearm")
    for fname, dx, dz, length in [
        ("thumb",-0.13,-0.02,-0.08),("index",-0.075,-0.17,-0.20),
        ("middle",-0.025,-0.20,-0.24),("ring",0.03,-0.18,-0.22),("little",0.08,-0.13,-0.17)]:
        x0=s*0.72+s*dx; z0=1.23+dz*0.15
        x1=x0+s*dx*0.55; z1=z0+length*0.48
        x2=x1+s*dx*0.35; z2=z1+length*0.52
        bone(f"{side}_{fname}_1",(x0,-0.065,z0),(x1,-0.065,z1),side+"_hand")
        bone(f"{side}_{fname}_2",(x1,-0.065,z1),(x2,-0.065,z2),f"{side}_{fname}_1")
bone("left_leg",(-0.19,0,1.25),(-0.20,0,0.36),"hips")
bone("right_leg",(0.19,0,1.25),(0.20,0,0.36),"hips")
bone("left_foot",(-0.20,0,0.36),(-0.20,-0.20,0.16),"left_leg")
bone("right_foot",(0.20,0,0.36),(0.20,-0.20,0.16),"right_leg")
bpy.ops.object.mode_set(mode='OBJECT')

# Add armature modifiers and one-bone weights for each stylized part.
for obj, bone_name in parts:
    if not bone_name:
        continue
    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    mod = obj.modifiers.new("Ishara skinning", 'ARMATURE')
    mod.object = arm
    obj.parent = arm

# Add a neutral idle action with a tiny head nod and a hand/finger test pose.
arm.animation_data_create()
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
for pb in arm.pose.bones:
    pb.rotation_mode = 'XYZ'
bpy.ops.object.mode_set(mode='OBJECT')

# Set a clean viewport and select rig
bpy.ops.object.select_all(action='DESELECT')
arm.select_set(True)
bpy.context.view_layer.objects.active = arm

# Export selected scene to GLB. All meshes and rig are exported.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=EXPORT_PATH,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_animations=True,
)
print("Ishara avatar exported to:", EXPORT_PATH)
