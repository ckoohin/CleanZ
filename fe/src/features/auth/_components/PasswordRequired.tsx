import { CheckCircle2, Circle } from 'lucide-react';
import { PasswordRequiredProps } from '../types/auth.type';

const passwordRequirements = [
    { label: 'Ít nhất 8 ký tự', test: (pw: string) => pw.length >= 8 },
    { label: 'Chứa ít nhất một chữ số', test: (pw: string) => /\d/.test(pw) },
    { label: 'Chứa ít nhất một chữ cái viết hoa', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'Chứa ít nhất một ký tự đặc biệt', test: (pw: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw) },
];

export function PasswordRequired({
    password
}: PasswordRequiredProps) {
    return (
        <>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-secondary/30 p-3 rounded-lg border border-border/50">
                {passwordRequirements.map((req, index) => {
                    const isMet = password && req.test(password);
                    return (
                        <div key={index} className="flex items-center gap-2 text-[11px]">
                            {isMet ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            ) : (
                                <Circle className="w-3.5 h-3.5 text-muted-foreground/30" />
                            )}
                            <span className={isMet ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                                {req.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </>
    )
}

export default PasswordRequired
