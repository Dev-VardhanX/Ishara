import React, { Suspense, lazy, forwardRef } from 'react';
import type { SignAvatarProps, SignAvatarHandle } from './SignAvatarCanvas';

const SignAvatarCanvas = lazy(() => import('./SignAvatarCanvas'));

export const SignAvatar = forwardRef<SignAvatarHandle, SignAvatarProps>((props, ref) => {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full min-h-[380px] flex flex-col items-center justify-center bg-white/40 rounded-2xl animate-pulse">
          <div className="w-24 h-24 rounded-full bg-[#7C9CFF]/20 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-[#7C9CFF] border-t-transparent animate-spin" />
          </div>
          <span className="mt-3 text-xs font-black text-[#6E7387]">Loading 3D Sign Avatar...</span>
        </div>
      }
    >
      <SignAvatarCanvas ref={ref} {...props} />
    </Suspense>
  );
});

SignAvatar.displayName = 'SignAvatar';
export default SignAvatar;
