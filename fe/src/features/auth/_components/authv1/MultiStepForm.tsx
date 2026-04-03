import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { StepOne } from '@/features/auth/_components/authv1/steps/StepOne';
import { StepTwo } from '@/features/auth/_components/authv1/steps/StepTwo';
import { StepThree } from '@/features/auth/_components/authv1/steps/StepThree';
import { ProgressIndicator } from './ProgressIndicator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRegisterContext } from '../../context/register.context';
import { fadeUp } from './SignInFlow';
import { SocialSignIn } from './SocialSignIn';

const TOTAL_STEPS = 3;
export function MultiStepForm() {
  const { prevStep, currentStep , isPending } = useRegisterContext()
  return (
    <>
      <div className="w-full ">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            {currentStep > 1 && (
              <Button
                onClick={prevStep}
                variant="ghost"
                size="icon"
                className={`-ml-2 text-primary border-2 border-primary ${isPending ? 'cursor-not-allowed opacity-30' : ''}`}
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex-1">
              <h1 className="text-3xl">Đăng ký tài khoản</h1>
              <p className="text-gray-600 mt-1">
                Bước {currentStep} của {TOTAL_STEPS}
              </p>
            </div>
          </div>

          <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

        </div>

        {/* Form Steps */}
        <AnimatePresence mode="wait">
          {/* step 1 */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StepOne />
            </motion.div>
          )}

          {/* step 2 */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StepTwo />
            </motion.div>
          )}

          {/* step 3 */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StepThree />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="my-8 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-4 bg-background text-muted-foreground">
              Hoặc đăng ký nhanh qua
            </span>
          </div>
        </div>

        <motion.div
          custom={2} variants={fadeUp} initial="hidden" animate="show"
        >
          <SocialSignIn
            url_gg={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
            url_facebook={`${process.env.NEXT_PUBLIC_API_URL}/auth/facebook`}
            text_gg="Tạo tài khoản với Google"
            text_facebook="Tạo tài khoản với Facebook"
          />
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href={'/login'} className="text-primary font-bold hover:underline underline-offset-4">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </>
  );
}