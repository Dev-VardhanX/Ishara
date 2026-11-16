import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import {
  AvatarExpression,
  BoneName,
  QuatTuple,
  SkinToneId,
  SKIN_TONES,
} from './types';
import { NEUTRAL_POSE_JOINTS } from './clipStore';

const PALETTE = {
  hoodieLavender: 0xb8a4f8,   // Soft pastel periwinkle-lavender hoodie from reference
  hoodiePocket: 0xa792f0,     // Slightly deeper tone for pocket & cuffs
  backpackStrap: 0x5b8def,    // Accent blue shoulder straps
  drawstringWhite: 0xf8f9fc,  // Crisp clay white drawstrings & teeth
  hairBrown: 0x5c3828,        // Warm sculpted clay chestnut brown hair & brows
  irisBrown: 0x4a2c1d,        // Warm brown iris
  pupilDark: 0x1e1e28,        // Deep slate pupil & mouth cavity
  coralNose: 0xf09c86,        // Soft warm rosy clay nose & blush
  tonguePink: 0xe87a7a,
  eyeWhite: 0xffffff,
};

/**
 * Handcrafted matte plasticine / stop-motion clay material
 */
function makeClayMat(colorHex: number | string, roughness = 0.78): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness,
    metalness: 0.0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.85,
    sheen: 0.45,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0xfff5ee),
  });
}

export class ClayAvatarRig {
  public root = new THREE.Group();
  public bones: Partial<Record<BoneName, THREE.Bone>> = {};
  public restQuats: Partial<Record<BoneName, THREE.Quaternion>> = {};

  // Compatibility getter so callers using rig.group or rig.root both work seamlessly
  public get group(): THREE.Group {
    return this.root;
  }

  private skinMat: THREE.MeshPhysicalMaterial;
  private hoodieMat: THREE.MeshPhysicalMaterial;
  private cuffMat: THREE.MeshPhysicalMaterial;
  private strapMat: THREE.MeshPhysicalMaterial;
  private hairMat: THREE.MeshPhysicalMaterial;
  private whiteMat: THREE.MeshPhysicalMaterial;
  private irisMat: THREE.MeshPhysicalMaterial;
  private darkMat: THREE.MeshPhysicalMaterial;
  private blushMat: THREE.MeshPhysicalMaterial;
  private mouthMat: THREE.MeshPhysicalMaterial;

  // Facial expression nodes
  private leftBrow!: THREE.Mesh;
  private rightBrow!: THREE.Mesh;
  private mouthGroup!: THREE.Group;
  private mouthNeutral!: THREE.Mesh;
  private mouthHappy!: THREE.Group;
  private mouthSad!: THREE.Mesh;
  private mouthQuestion!: THREE.Mesh;

  public currentExpression: AvatarExpression = 'neutral';
  private vrmInstance: VRM | null = null;
  private proceduralGroup = new THREE.Group();

  constructor(skinTone: SkinToneId = 'warm-peach') {
    this.skinMat = makeClayMat(SKIN_TONES[skinTone], 0.72);
    this.hoodieMat = makeClayMat(PALETTE.hoodieLavender, 0.82);
    this.cuffMat = makeClayMat(PALETTE.hoodiePocket, 0.84);
    this.strapMat = makeClayMat(PALETTE.backpackStrap, 0.78);
    this.hairMat = makeClayMat(PALETTE.hairBrown, 0.76);
    this.whiteMat = makeClayMat(PALETTE.eyeWhite, 0.25);
    this.irisMat = makeClayMat(PALETTE.irisBrown, 0.3);
    this.darkMat = makeClayMat(PALETTE.pupilDark, 0.4);
    this.blushMat = makeClayMat(PALETTE.coralNose, 0.78);
    this.mouthMat = makeClayMat(PALETTE.tonguePink, 0.65);

    this.root.add(this.proceduralGroup);
    this.buildProceduralRig();
    this.applyPose(NEUTRAL_POSE_JOINTS, 1);
  }

  private createBone(name: BoneName, parent: THREE.Object3D, pos: [number, number, number]): THREE.Bone {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(pos[0], pos[1], pos[2]);
    parent.add(bone);
    this.bones[name] = bone;
    this.restQuats[name] = bone.quaternion.clone();
    return bone;
  }

  private buildProceduralRig(): void {
    // 1. Cozy Pastel Hoodie Torso (chunky rounded silhouette + flat ribbed bottom waistband)
    const torso = this.createBone('Torso', this.proceduralGroup, [0, -0.36, 0]);

    const bodyGeo = new THREE.CapsuleGeometry(0.225, 0.24, 20, 32);
    bodyGeo.scale(1.14, 1.0, 0.78);
    const bodyMesh = new THREE.Mesh(bodyGeo, this.hoodieMat);
    bodyMesh.position.set(0, 0.22, 0);
    torso.add(bodyMesh);

    // Ribbed bottom hoodie waistband hem (fixes the pointy cone bottom!)
    const hemGeo = new THREE.CylinderGeometry(0.238, 0.232, 0.065, 32);
    hemGeo.scale(1.08, 1.0, 0.74);
    const hemMesh = new THREE.Mesh(hemGeo, this.cuffMat);
    hemMesh.position.set(0, 0.04, 0);
    torso.add(hemMesh);

    // Kangaroo front hoodie pocket
    const pocketGeo = new THREE.BoxGeometry(0.24, 0.12, 0.04);
    const pocketMesh = new THREE.Mesh(pocketGeo, this.cuffMat);
    pocketMesh.position.set(0, 0.125, 0.162);
    pocketMesh.rotation.x = 0.08;
    torso.add(pocketMesh);

    // Sculpted Plush Hood Collar around neck
    const hoodRingGeo = new THREE.TorusGeometry(0.125, 0.042, 18, 36);
    hoodRingGeo.rotateX(Math.PI / 2 + 0.12);
    hoodRingGeo.scale(1.12, 1.0, 0.92);
    const hoodRing = new THREE.Mesh(hoodRingGeo, this.hoodieMat);
    hoodRing.position.set(0, 0.435, -0.01);
    torso.add(hoodRing);

    // Two White Clay Hoodie Drawstrings hanging on chest
    for (const side of [-1, 1]) {
      const stringGeo = new THREE.CapsuleGeometry(0.0105, 0.125, 8, 12);
      const drawString = new THREE.Mesh(stringGeo, this.whiteMat);
      drawString.position.set(side * 0.046, 0.34, 0.172);
      drawString.rotation.x = -0.1;
      torso.add(drawString);
    }

    // Blue Backpack Shoulder Straps (from reference image)
    for (const side of [-1, 1]) {
      const strapGeo = new THREE.TorusGeometry(0.195, 0.024, 12, 28, Math.PI * 0.85);
      strapGeo.rotateY(Math.PI / 2);
      const strap = new THREE.Mesh(strapGeo, this.strapMat);
      strap.position.set(side * 0.155, 0.24, 0.02);
      strap.rotation.z = side * -0.12;
      torso.add(strap);
    }

    // 2. Neck & Warm Sculpted Head (slightly wider cute lower cheeks like reference)
    const neck = this.createBone('Neck', torso, [0, 0.43, 0]);
    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 0.1, 24), this.skinMat);
    neckMesh.position.set(0, 0.045, 0);
    neck.add(neckMesh);

    const head = this.createBone('Head', neck, [0, 0.095, 0]);
    const headGeo = new THREE.SphereGeometry(0.205, 36, 36);
    headGeo.scale(1.02, 0.98, 0.94);
    const headMesh = new THREE.Mesh(headGeo, this.skinMat);
    headMesh.position.set(0, 0.17, 0);
    head.add(headMesh);

    // Soft Chubby Lower Cheeks
    for (const side of [-1, 1]) {
      const jawPuff = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 20), this.skinMat);
      jawPuff.scale.set(1.05, 0.82, 0.88);
      jawPuff.position.set(side * 0.095, 0.125, 0.065);
      head.add(jawPuff);
    }

    // Sculpted Clay Ears with Inner Hollow
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.205, 0.162, -0.005);
      earGroup.rotation.y = side * -0.25;

      const outerEar = new THREE.Mesh(new THREE.SphereGeometry(0.044, 18, 18), this.skinMat);
      outerEar.scale.set(0.55, 1.05, 0.8);

      const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 14), this.blushMat);
      innerEar.scale.set(0.45, 0.85, 0.6);
      innerEar.position.set(side * 0.006, 0, 0.014);

      earGroup.add(outerEar, innerEar);
      head.add(earGroup);
    }

    // 3. Full Crown of Fluffy Clay Curls (matches the curly-haired boy in reference!)
    this.buildCurlyClayHair(head);
    this.buildFace(head);
    this.buildArm('Left', torso);
    this.buildArm('Right', torso);
  }

  private buildCurlyClayHair(head: THREE.Bone): void {
    const hairGroup = new THREE.Group();
    head.add(hairGroup);

    // Base hair volume cap on back/top of skull
    const baseCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.208, 28, 24, 0, Math.PI * 2, 0, Math.PI * 0.62),
      this.hairMat
    );
    baseCap.position.set(0, 0.185, -0.022);
    baseCap.rotation.x = -0.38;
    hairGroup.add(baseCap);

    // Clustered puffy clay curls & swirl puffs framing the forehead, crown, and temples
    const curlPuffs: Array<[number, number, number, number]> = [
      // Front forehead curls (high enough so eyebrows stay 100% visible)
      [0.0, 0.345, 0.145, 0.068],
      [-0.075, 0.338, 0.135, 0.064],
      [0.078, 0.34, 0.132, 0.065],
      [-0.135, 0.305, 0.105, 0.06],
      [0.138, 0.308, 0.102, 0.06],
      // Temple curls above ears
      [-0.185, 0.25, 0.045, 0.058],
      [0.185, 0.252, 0.045, 0.058],
      [-0.195, 0.205, -0.015, 0.052],
      [0.195, 0.205, -0.015, 0.052],
      // Top crown volume curls
      [0.0, 0.385, 0.055, 0.074],
      [-0.088, 0.375, 0.048, 0.07],
      [0.088, 0.378, 0.048, 0.07],
      [-0.15, 0.345, -0.01, 0.065],
      [0.15, 0.345, -0.01, 0.065],
      [0.0, 0.375, -0.055, 0.075],
      [-0.095, 0.36, -0.075, 0.068],
      [0.095, 0.36, -0.075, 0.068],
    ];

    for (const [x, y, z, r] of curlPuffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 18), this.hairMat);
      puff.scale.set(1.08, 0.94, 1.02);
      puff.position.set(x, y, z);
      hairGroup.add(puff);

      // Add a sculpted clay coil ridge on front/top curls for authentic plasticine swirl texture
      if (z > 0.04) {
        const swirl = new THREE.Mesh(
          new THREE.TorusGeometry(r * 0.52, r * 0.24, 10, 20, Math.PI * 1.35),
          this.hairMat
        );
        swirl.position.set(x, y + r * 0.15, z + r * 0.55);
        swirl.rotation.set(0.3, x * 2.0, 0.4);
        hairGroup.add(swirl);
      }
    }
  }

  private buildFace(head: THREE.Bone): void {
    // 1. Large Expressive Layered Eyes (White Sclera + Brown Iris + Dark Pupil + Specular Catchlight)
    const buildLayeredEye = (xPos: number): void => {
      const group = new THREE.Group();
      group.position.set(xPos, 0.182, 0.184);

      // White sclera oval
      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.032, 22, 22), this.whiteMat);
      sclera.scale.set(1.05, 1.12, 0.42);

      // Warm brown iris
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.021, 20, 20), this.irisMat);
      iris.scale.set(1.0, 1.08, 0.45);
      iris.position.set(0, -0.001, 0.007);

      // Deep dark pupil
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.013, 16, 16), this.darkMat);
      pupil.scale.set(1.0, 1.08, 0.45);
      pupil.position.set(0, -0.001, 0.011);

      // Bright white specular catchlight
      const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.0058, 12, 12), this.whiteMat);
      catchlight.position.set(-0.007, 0.008, 0.016);

      group.add(sclera, iris, pupil, catchlight);
      head.add(group);
    };

    buildLayeredEye(0.068);
    buildLayeredEye(-0.068);

    // 2. Plump Rosy Clay Button Nose (matches reference)
    const noseGeo = new THREE.SphereGeometry(0.024, 20, 20);
    noseGeo.scale(1.12, 0.88, 0.95);
    const nose = new THREE.Mesh(noseGeo, this.blushMat);
    nose.position.set(0, 0.152, 0.208);
    head.add(nose);

    // 3. Soft Warm Cheek Blush
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 16), this.blushMat);
      cheek.scale.set(1.25, 0.82, 0.22);
      cheek.position.set(side * 0.118, 0.138, 0.172);
      cheek.rotation.y = side * 0.42;
      head.add(cheek);
    }

    // 4. Thick Sculpted Warm-Brown Eyebrows
    const browCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.026, -0.004, 0),
      new THREE.Vector3(0, 0.006, 0.005),
      new THREE.Vector3(0.026, -0.004, 0)
    );
    const browGeo = new THREE.TubeGeometry(browCurve, 14, 0.0085, 10, false);
    this.leftBrow = new THREE.Mesh(browGeo, this.hairMat);
    this.leftBrow.position.set(0.068, 0.242, 0.186);
    this.rightBrow = new THREE.Mesh(browGeo, this.hairMat);
    this.rightBrow.position.set(-0.068, 0.242, 0.186);
    head.add(this.leftBrow, this.rightBrow);

    // 5. 3D Sculpted Mouth with Upper Teeth Bar (matches open clay smile in reference)
    this.mouthGroup = new THREE.Group();
    this.mouthGroup.position.set(0, 0.104, 0.195);
    head.add(this.mouthGroup);

    // Neutral soft smile
    const neutralCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.026, 0.003, 0),
      new THREE.Vector3(0, -0.006, 0.004),
      new THREE.Vector3(0.026, 0.003, 0)
    );
    this.mouthNeutral = new THREE.Mesh(
      new THREE.TubeGeometry(neutralCurve, 14, 0.0055, 8, false),
      this.darkMat
    );

    // Happy open clay smile with white teeth bar
    this.mouthHappy = new THREE.Group();
    const smileCavity = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 18, 14, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
      this.darkMat
    );
    smileCavity.scale.set(1.25, 0.75, 0.35);
    smileCavity.position.y = 0.006;

    const teethBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055, 0.036, 8, 12), this.whiteMat);
    teethBar.rotation.z = Math.PI / 2;
    teethBar.position.set(0, 0.004, 0.005);
    this.mouthHappy.add(smileCavity, teethBar);

    // Sad mouth
    const sadGeo = new THREE.TorusGeometry(0.022, 0.0055, 10, 20, Math.PI);
    this.mouthSad = new THREE.Mesh(sadGeo, this.darkMat);
    this.mouthSad.position.y = -0.01;

    // Questioning 'O' mouth
    const questionGeo = new THREE.TorusGeometry(0.013, 0.0055, 10, 20);
    this.mouthQuestion = new THREE.Mesh(questionGeo, this.darkMat);

    this.mouthGroup.add(this.mouthNeutral, this.mouthHappy, this.mouthSad, this.mouthQuestion);
    this.setExpression('happy');
  }

  private buildArm(side: 'Left' | 'Right', torso: THREE.Bone): void {
    const dir = side === 'Left' ? 1 : -1;

    // 1. Hoodie Full-Length Sleeve (hides shoulder & elbow joints completely like reference!)
    const shoulder = this.createBone(`${side}Shoulder`, torso, [dir * 0.235, 0.35, 0]);
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.076, 22, 22), this.hoodieMat);
    shoulder.add(shoulderCap);

    const upperArmLen = 0.23;
    const upperSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.066, upperArmLen, 22),
      this.hoodieMat
    );
    upperSleeve.position.set(0, -upperArmLen / 2, 0);
    shoulder.add(upperSleeve);

    // Seamless Hoodie Elbow Sphere (same lavender hoodie fabric — zero skin gap!)
    const elbow = this.createBone(`${side}Elbow`, shoulder, [0, -upperArmLen, 0]);
    const elbowSleeveBall = new THREE.Mesh(new THREE.SphereGeometry(0.065, 22, 22), this.hoodieMat);
    elbow.add(elbowSleeveBall);

    // Lower Hoodie Forearm Sleeve + Ribbed Wrist Cuff
    const foreArmLen = 0.22;
    const lowerSleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.064, 0.052, foreArmLen * 0.84, 22),
      this.hoodieMat
    );
    lowerSleeve.position.set(0, -(foreArmLen * 0.42), 0);
    elbow.add(lowerSleeve);

    const wristCuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.014, 14, 28),
      this.cuffMat
    );
    wristCuff.rotation.x = Math.PI / 2;
    wristCuff.position.set(0, -foreArmLen * 0.84, 0);
    elbow.add(wristCuff);

    // 2. Plump Sculpted Clay Hand (no mechanical wrist crease!)
    const wrist = this.createBone(`${side}Wrist`, elbow, [0, -foreArmLen, 0]);
    wrist.scale.setScalar(1.24);

    const wristBridge = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.035, 18), this.skinMat);
    wristBridge.position.set(0, 0.01, 0);
    wrist.add(wristBridge);

    const palmGeo = new THREE.SphereGeometry(0.048, 24, 24);
    palmGeo.scale(1.02, 1.05, 0.48);
    const palmMesh = new THREE.Mesh(palmGeo, this.skinMat);
    palmMesh.position.set(0, -0.04, 0);
    wrist.add(palmMesh);

    // Plump Clay Thumb (2 joints, naturally angled outward)
    const thumb1 = this.createBone(`${side}Thumb1` as BoneName, wrist, [dir * 0.04, -0.034, 0.014]);
    thumb1.rotation.z = dir * 0.58;
    this.addPhalanxMesh(thumb1, 0.0145, 0.028);

    const thumb2 = this.createBone(`${side}Thumb2` as BoneName, thumb1, [0, -0.028, 0]);
    thumb2.rotation.z = -dir * 0.16;
    this.addPhalanxMesh(thumb2, 0.0135, 0.024);

    // 4 Chubby Claymation Fingers (3 joints each, soft rounded tips)
    const fingerSpecs: Array<{ name: 'Index' | 'Middle' | 'Ring' | 'Pinky'; x: number; scale: number; splay: number }> = [
      { name: 'Index', x: dir * 0.03, scale: 0.96, splay: dir * 0.035 },
      { name: 'Middle', x: dir * 0.01, scale: 1.04, splay: 0 },
      { name: 'Ring', x: -dir * 0.01, scale: 0.95, splay: -dir * 0.03 },
      { name: 'Pinky', x: -dir * 0.029, scale: 0.82, splay: -dir * 0.065 },
    ];

    for (const f of fingerSpecs) {
      const l1 = 0.03 * f.scale;
      const l2 = 0.023 * f.scale;
      const l3 = 0.019 * f.scale;
      const r = 0.0118 * Math.max(0.88, f.scale);

      const j1 = this.createBone(`${side}${f.name}1` as BoneName, wrist, [f.x, -0.078, 0]);
      j1.rotation.z = f.splay;
      this.addPhalanxMesh(j1, r, l1);

      const j2 = this.createBone(`${side}${f.name}2` as BoneName, j1, [0, -l1, 0]);
      this.addPhalanxMesh(j2, r * 0.95, l2);

      const j3 = this.createBone(`${side}${f.name}3` as BoneName, j2, [0, -l2, 0]);
      this.addPhalanxMesh(j3, r * 0.9, l3);
    }
  }

  private addPhalanxMesh(bone: THREE.Bone, radius: number, length: number): void {
    const knuckle = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 14), this.skinMat);
    bone.add(knuckle);

    const shaft = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius * 0.98, Math.max(0.004, length - radius * 1.1), 10, 14),
      this.skinMat
    );
    shaft.position.set(0, -length / 2, 0);
    bone.add(shaft);
  }

  public setSkinTone(tone: SkinToneId): void {
    this.skinMat.color.set(SKIN_TONES[tone]);
  }

  public setExpression(expr: AvatarExpression): void {
    this.currentExpression = expr;
    this.mouthNeutral.visible = expr === 'neutral';
    this.mouthHappy.visible = expr === 'happy';
    this.mouthSad.visible = expr === 'sad';
    this.mouthQuestion.visible = expr === 'questioning';

    if (expr === 'neutral') {
      this.leftBrow.position.y = 0.242;
      this.rightBrow.position.y = 0.242;
      this.leftBrow.rotation.z = 0;
      this.rightBrow.rotation.z = 0;
    } else if (expr === 'happy') {
      this.leftBrow.position.y = 0.25;
      this.rightBrow.position.y = 0.25;
      this.leftBrow.rotation.z = -0.08;
      this.rightBrow.rotation.z = 0.08;
    } else if (expr === 'questioning') {
      this.leftBrow.position.y = 0.258;
      this.rightBrow.position.y = 0.244;
      this.leftBrow.rotation.z = -0.16;
      this.rightBrow.rotation.z = 0.06;
    } else if (expr === 'sad') {
      this.leftBrow.position.y = 0.236;
      this.rightBrow.position.y = 0.236;
      this.leftBrow.rotation.z = 0.2;
      this.rightBrow.rotation.z = -0.2;
    }

    if (this.vrmInstance?.expressionManager) {
      this.vrmInstance.expressionManager.setValue('happy', expr === 'happy' ? 1 : 0);
      this.vrmInstance.expressionManager.setValue('sad', expr === 'sad' ? 1 : 0);
      this.vrmInstance.expressionManager.setValue('surprised', expr === 'questioning' ? 0.7 : 0);
    }
  }

  public applyPose(joints: Partial<Record<BoneName, QuatTuple>>, slerpAlpha = 0.35): void {
    const targetQ = new THREE.Quaternion();
    for (const [boneName, tuple] of Object.entries(joints) as Array<[BoneName, QuatTuple]>) {
      const bone = this.bones[boneName];
      if (bone && tuple) {
        targetQ.set(tuple[0], tuple[1], tuple[2], tuple[3]);
        if (slerpAlpha >= 1) {
          bone.quaternion.copy(targetQ);
        } else {
          bone.quaternion.slerp(targetQ, slerpAlpha);
        }
      }
    }
    if (this.vrmInstance) {
      this.syncToVRM();
    }
  }

  public updateIdleBreathing(elapsedSec: number): void {
    const torso = this.bones.Torso;
    const head = this.bones.Head;
    if (torso) {
      torso.position.y = -0.36 + Math.sin(elapsedSec * 2.1) * 0.006;
    }
    if (head && this.currentExpression === 'questioning') {
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, 0.08, 0.1);
    } else if (head) {
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, 0, 0.1);
    }
    if (this.vrmInstance) {
      this.vrmInstance.update(1 / 60);
    }
  }

  public async loadOptionalVRM(url: string): Promise<void> {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm as VRM | undefined;
    if (!vrm) throw new Error('Invalid VRM file');

    if (this.vrmInstance) {
      this.root.remove(this.vrmInstance.scene);
    }
    this.vrmInstance = vrm;
    this.proceduralGroup.visible = false;
    vrm.scene.position.set(0, -1.25, 0);
    this.root.add(vrm.scene);
  }

  public async loadVRM(url: string): Promise<boolean> {
    try {
      await this.loadOptionalVRM(url);
      return true;
    } catch {
      return false;
    }
  }

  public clearVRM(): void {
    if (this.vrmInstance) {
      this.root.remove(this.vrmInstance.scene);
      this.vrmInstance = null;
    }
    this.proceduralGroup.visible = true;
  }

  private syncToVRM(): void {
    if (!this.vrmInstance?.humanoid) return;
    const map: Partial<Record<BoneName, VRMHumanBoneName>> = {
      Torso: 'chest',
      Neck: 'neck',
      Head: 'head',
      LeftShoulder: 'leftUpperArm',
      LeftElbow: 'leftLowerArm',
      LeftWrist: 'leftHand',
      RightShoulder: 'rightUpperArm',
      RightElbow: 'rightLowerArm',
      RightWrist: 'rightHand',
    };
    for (const [bName, vrmName] of Object.entries(map) as Array<[BoneName, VRMHumanBoneName]>) {
      const src = this.bones[bName];
      const dst = this.vrmInstance.humanoid.getNormalizedBoneNode(vrmName);
      if (src && dst) {
        dst.quaternion.copy(src.quaternion);
      }
    }
  }

  public dispose(): void {
    this.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }
}
