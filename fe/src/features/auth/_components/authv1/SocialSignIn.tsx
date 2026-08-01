import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { SocialSignInProps } from '../../types/social.type';

export function SocialSignIn({
  url_gg,
  url_facebook,
  text_gg,
  text_facebook
}: SocialSignInProps) {
  const router = useRouter()

  return (
    <div className="space-y-2 flex flex-col">
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>{text_gg}</span>
          </Button>
        }
        title="Xác nhận"
        description="Bạn có chắc chắn muốn đăng nhập với Google"
        onConfirm={() => {
          router.push(url_gg);
        }}
      />

      {url_facebook && text_facebook && (
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full hover:bg-blue-600 hover:text-white group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" className='text-[#1877F2] group-hover:!text-white' fill="currentColor">
                <path d="M279.14 288l14.22-92.66h-88.91V127.66c0-25.35
                  12.42-50.06 52.24-50.06H293V6.26S259.43
                  0 225.36 0C141.09 0 89.09 54.42
                  89.09 153.12V195.3H0V288h89.09v224h107.45V288z"/>
              </svg>
              <span>{text_facebook}</span>
            </Button>
          }
          title="Xác nhận"
          description="Bạn có chắc chắn muốn đăng nhập với Facebook"
          onConfirm={() => {
            router.push(url_facebook);
          }}
        />
      )}
    </div>
  );
}
