'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UtensilsCrossed, Mail, Lock, User, Phone, Eye, EyeOff, ChefHat, Sparkles, ArrowRight, Facebook, Chrome } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Card, CardDescription, CardTitle } from './ui/card';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Form submitted:', formData);
    setIsLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Generate floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#6B9440] via-[#7FA84F] to-[#5A8435] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-[#A8C686]/30 to-transparent rounded-full blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, 150, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-radial from-[#8FB961]/30 to-transparent rounded-full blur-3xl"
        animate={{
          x: [0, -100, 0],
          y: [0, -150, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Main container with glassmorphism */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, rotateX: 10 }}
        animate={{ opacity: 1, scale: 1, rotateX: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-7xl relative"
        style={{ perspective: '2000px' }}
      >
        <Card className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20">
          <div className="flex flex-col lg:flex-row">
            {/* Left side - Enhanced branding section */}
            <motion.div
              className="w-full lg:w-5/12 bg-gradient-to-br from-[#7FA84F] via-[#6B9440] to-[#5A8435] p-10 lg:p-16 flex flex-col justify-between relative overflow-hidden"
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-32 h-32 border-4 border-white rounded-full" />
                <div className="absolute bottom-20 right-10 w-40 h-40 border-4 border-white rounded-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white rounded-full" />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <motion.div
                  initial={{ y: -30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="mb-12"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <motion.div
                      className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shadow-xl border border-white/30"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <UtensilsCrossed className="w-9 h-9 text-white" strokeWidth={2.5} />
                    </motion.div>
                    <div>
                      <h1 className="text-4xl font-bold text-white tracking-tight">Savory</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <Sparkles className="w-4 h-4 text-white/80" />
                        <p className="text-white/90 text-sm font-medium">Buffet Management Pro</p>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                  >
                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                      Nâng tầm trải nghiệm <br />
                      <span className="text-white/80">ẩm thực buffet</span>
                    </h2>
                    <p className="text-white/90 text-lg leading-relaxed mb-6">
                      Hệ thống quản lý nhà hàng thông minh với công nghệ hiện đại, 
                      tối ưu hoá trải nghiệm khách hàng và vận hành
                    </p>

                    {/* Feature badges */}
                    <div className="flex flex-wrap gap-3">
                      {['Gọi món thông minh', 'Quản lý real-time', 'Báo cáo chi tiết'].map((feature, idx) => (
                        <motion.div
                          key={feature}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + idx * 0.1 }}
                        >
                          <Badge variant="secondary" className="px-4 py-2 bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30">
                            {feature}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>

                {/* Stats section */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  className="grid grid-cols-3 gap-6 mb-8"
                >
                  {[
                    { number: '500+', label: 'Nhà hàng' },
                    { number: '50K+', label: 'Người dùng' },
                    { number: '99%', label: 'Hài lòng' }
                  ].map((stat) => (
                    <motion.div
                      key={stat.label}
                      className="text-center"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="text-3xl font-bold text-white mb-1">{stat.number}</div>
                      <div className="text-white/70 text-xs">{stat.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Animated food showcase */}
              <motion.div
                className="relative z-10"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                <div className="relative">
                  <motion.div
                    animate={{
                      y: [0, -20, 0],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="relative rounded-3xl overflow-hidden shadow-2xl"
                  >
                    <ImageWithFallback
                      src="https://images.unsplash.com/photo-1763207291832-819499e261dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidWZmZXQlMjByZXN0YXVyYW50JTIwZm9vZCUyMHNwcmVhZHxlbnwxfHx8fDE3NzIwMTExMDh8MA&ixlib=rb-4.1.0&q=80&w=1080"
                      alt="Buffet Food"
                      className="w-full h-56 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#7FA84F] via-transparent to-transparent" />
                    
                    {/* Floating badge */}
                    <motion.div
                      className="absolute top-4 right-4"
                      animate={{
                        y: [0, -5, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <Badge className="bg-white/20 backdrop-blur-xl text-white border-white/30 hover:bg-white/30">
                        🍽️ Premium Buffet
                      </Badge>
                    </motion.div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Decorative chef hat icon */}
              <motion.div
                className="absolute bottom-10 right-10 opacity-10"
                animate={{
                  rotate: [0, 10, 0, -10, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <ChefHat className="w-40 h-40 text-white" strokeWidth={1} />
              </motion.div>
            </motion.div>

            {/* Right side - Modern auth form */}
            <motion.div
              className="w-full lg:w-7/12 p-10 lg:p-16 flex flex-col justify-center relative"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              {/* Subtle background decoration */}
              <div className="absolute top-10 right-10 w-32 h-32 bg-[#7FA84F]/5 rounded-full blur-3xl" />
              <div className="absolute bottom-10 left-10 w-40 h-40 bg-[#8FB961]/5 rounded-full blur-3xl" />

              {/* Toggle with modern design */}
              <div className="flex gap-3 mb-10 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl" />
                <Button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  variant={isLogin ? "default" : "ghost"}
                  className={`relative flex-1 h-12 rounded-xl font-semibold transition-all z-10 ${
                    isLogin 
                      ? 'bg-gradient-to-r from-[#7FA84F] to-[#6B9440] hover:from-[#6B9440] hover:to-[#5A8435] shadow-lg' 
                      : 'hover:bg-transparent'
                  }`}
                  asChild
                >
                  <motion.button
                    whileHover={{ scale: isLogin ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Đăng nhập
                  </motion.button>
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  variant={!isLogin ? "default" : "ghost"}
                  className={`relative flex-1 h-12 rounded-xl font-semibold transition-all z-10 ${
                    !isLogin 
                      ? 'bg-gradient-to-r from-[#7FA84F] to-[#6B9440] hover:from-[#6B9440] hover:to-[#5A8435] shadow-lg' 
                      : 'hover:bg-transparent'
                  }`}
                  asChild
                >
                  <motion.button
                    whileHover={{ scale: !isLogin ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Đăng ký
                  </motion.button>
                </Button>
              </div>

              {/* Form */}
              <AnimatePresence mode="wait">
                <motion.form
                  key={isLogin ? 'login' : 'signup'}
                  initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                  transition={{ duration: 0.4 }}
                  onSubmit={handleSubmit}
                  className="space-y-6 relative z-10"
                >
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <CardTitle className="text-3xl mb-2">
                      {isLogin ? 'Chào mừng trở lại!' : 'Bắt đầu ngay hôm nay'}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {isLogin ? 'Đăng nhập để tiếp tục quản lý nhà hàng' : 'Tạo tài khoản để trải nghiệm đầy đủ tính năng'}
                    </CardDescription>
                  </motion.div>

                  {/* Name field (only for signup) */}
                  <AnimatePresence>
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="name" className="text-sm font-semibold">
                          Họ và tên
                        </Label>
                        <div className="relative group">
                          <motion.div
                            className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
                            animate={{
                              opacity: focusedField === 'name' ? 0.3 : 0
                            }}
                          />
                          <div className="relative flex items-center">
                            <User className="absolute left-4 w-5 h-5 text-muted-foreground" />
                            <Input
                              id="name"
                              type="text"
                              value={formData.name}
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              onFocus={() => setFocusedField('name')}
                              onBlur={() => setFocusedField(null)}
                              className="pl-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                              placeholder="Nguyễn Văn A"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email field */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="email" className="text-sm font-semibold">
                      Email
                    </Label>
                    <div className="relative group">
                      <motion.div
                        className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
                        animate={{
                          opacity: focusedField === 'email' ? 0.3 : 0
                        }}
                      />
                      <div className="relative flex items-center">
                        <Mail className="absolute left-4 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          onFocus={() => setFocusedField('email')}
                          onBlur={() => setFocusedField(null)}
                          className="pl-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                          placeholder="example@restaurant.com"
                        />
                      </div>
                    </div>
                  </motion.div>

                  {/* Phone field (only for signup) */}
                  <AnimatePresence>
                    {!isLogin && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-2"
                      >
                        <Label htmlFor="phone" className="text-sm font-semibold">
                          Số điện thoại
                        </Label>
                        <div className="relative group">
                          <motion.div
                            className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
                            animate={{
                              opacity: focusedField === 'phone' ? 0.3 : 0
                            }}
                          />
                          <div className="relative flex items-center">
                            <Phone className="absolute left-4 w-5 h-5 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              onFocus={() => setFocusedField('phone')}
                              onBlur={() => setFocusedField(null)}
                              className="pl-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                              placeholder="0123 456 789"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Password field */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="password" className="text-sm font-semibold">
                      Mật khẩu
                    </Label>
                    <div className="relative group">
                      <motion.div
                        className="absolute -inset-0.5 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity"
                        animate={{
                          opacity: focusedField === 'password' ? 0.3 : 0
                        }}
                      />
                      <div className="relative flex items-center">
                        <Lock className="absolute left-4 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          onFocus={() => setFocusedField('password')}
                          onBlur={() => setFocusedField(null)}
                          className="pl-12 pr-12 h-12 bg-white border-2 rounded-xl focus-visible:ring-[#7FA84F]"
                          placeholder="••••••••••"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 hover:bg-transparent"
                          asChild
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
                          </motion.button>
                        </Button>
                      </div>
                    </div>
                  </motion.div>

                  {/* Forgot password / Remember me */}
                  {isLogin && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="data-[state=checked]:bg-[#7FA84F] data-[state=checked]:border-[#7FA84F]"
                        />
                        <Label
                          htmlFor="remember"
                          className="text-sm cursor-pointer"
                        >
                          Ghi nhớ đăng nhập
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="link"
                        className="text-[#7FA84F] hover:text-[#6B9440] p-0 h-auto font-semibold"
                        asChild
                      >
                        <motion.button whileHover={{ x: 3 }}>
                          Quên mật khẩu?
                        </motion.button>
                      </Button>
                    </motion.div>
                  )}

                  {/* Submit button with loading */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 bg-gradient-to-r from-[#7FA84F] to-[#6B9440] hover:from-[#6B9440] hover:to-[#5A8435] text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-all group"
                      asChild
                    >
                      <motion.button
                        whileHover={{ scale: isLoading ? 1 : 1.02 }}
                        whileTap={{ scale: isLoading ? 1 : 0.98 }}
                      >
                        {isLoading ? (
                          <>
                            <motion.div
                              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            {isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản'}
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </motion.button>
                    </Button>
                  </motion.div>

                  {/* Divider */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="relative"
                  >
                    <Separator className="my-8" />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-sm text-muted-foreground">
                      Hoặc tiếp tục với
                    </span>
                  </motion.div>

                  {/* Social login */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 border-2 hover:border-[#7FA84F] hover:bg-gray-50 rounded-xl"
                      asChild
                    >
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Chrome className="w-5 h-5 mr-2" />
                        Google
                      </motion.button>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 border-2 hover:border-[#7FA84F] hover:bg-gray-50 rounded-xl"
                      asChild
                    >
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Facebook className="w-5 h-5 mr-2" />
                        Facebook
                      </motion.button>
                    </Button>
                  </motion.div>

                  {/* Terms (only for signup) */}
                  {!isLogin && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45 }}
                      className="text-xs text-muted-foreground text-center leading-relaxed"
                    >
                      Bằng việc đăng ký, bạn đồng ý với{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="text-[#7FA84F] hover:text-[#6B9440] p-0 h-auto text-xs font-medium"
                      >
                        Điều khoản dịch vụ
                      </Button>{' '}
                      và{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="text-[#7FA84F] hover:text-[#6B9440] p-0 h-auto text-xs font-medium"
                      >
                        Chính sách bảo mật
                      </Button>{' '}
                      của chúng tôi
                    </motion.p>
                  )}
                </motion.form>
              </AnimatePresence>

              {/* Decorative floating elements */}
              <motion.div
                className="absolute top-20 right-20 w-16 h-16 bg-gradient-to-br from-[#7FA84F]/20 to-[#6B9440]/20 rounded-2xl rotate-12"
                animate={{
                  y: [0, -10, 0],
                  rotate: [12, 22, 12],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute bottom-32 left-16 w-12 h-12 bg-gradient-to-br from-[#8FB961]/20 to-[#A8C686]/20 rounded-full"
                animate={{
                  y: [0, 15, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
