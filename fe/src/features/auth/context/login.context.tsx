import { createContext, useContext, useState } from "react";

type LoginContextType = {
    showPassword: boolean,
    setShowPassword: (value: boolean) => void
}

const LoginContext = createContext<LoginContextType | null>(null)

export function LoginProvider(
    {children} : {children: React.ReactNode}
) {
    const [showPassword, setShowPassword] = useState<boolean>(false);
    return (
        <LoginContext.Provider value={{
            showPassword,
            setShowPassword
        }}>
            {children}
        </LoginContext.Provider>
    )
}

export function useLoginContext() {
    const context = useContext(LoginContext)
    if (!context) {
        throw new Error("useLoginContext phải được sử dụng trong LoginProvider")
    }
    return context
}