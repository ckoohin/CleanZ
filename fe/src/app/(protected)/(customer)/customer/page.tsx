import React from 'react'

function CustomerPage() {
    return (
        <>
            <div>
                {/* TopNavBar */}
                <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
                    <div className="flex justify-between items-center px-6 py-3 max-w-7xl mx-auto">
                        <div className="flex items-center gap-8">
                            <span className="text-2xl font-black text-green-600 dark:text-green-500 tracking-tight">King Of Service</span>
                            <div className="hidden md:flex items-center bg-surface-container-low px-4 py-2 rounded-xl w-96 group focus-within:ring-2 ring-primary/20 transition-all">
                                <span className="material-symbols-outlined text-outline">search</span>
                                <input className="bg-transparent border-none focus:ring-0 text-sm w-full font-medium placeholder:text-outline-variant" placeholder="Bạn cần dịch vụ gì?" type="text" />
                            </div>
                        </div>
                        <nav className="hidden md:flex gap-6 items-center">
                            <a className="text-green-600 dark:text-green-400 font-bold border-b-2 border-green-600 font-manrope text-sm font-medium py-1" href="#">Dịch vụ</a>
                            <a className="text-slate-600 dark:text-slate-400 hover:text-green-600 font-manrope text-sm font-medium py-1 transition-colors" href="#">Giới thiệu</a>
                            <a className="text-slate-600 dark:text-slate-400 hover:text-green-600 font-manrope text-sm font-medium py-1 transition-colors" href="#">Hỗ trợ</a>
                        </nav>
                        <div className="flex items-center gap-4">
                            <button className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors relative">
                                <span className="material-symbols-outlined text-on-surface">notifications</span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
                            </button>
                            <div className="flex items-center gap-2 pl-2 border-l border-outline-variant">
                                <div className="w-9 h-9 rounded-full bg-surface-container-highest overflow-hidden">
                                    <img alt="Avatar" data-alt="User profile avatar circle" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwF3_tVpQKxgCbOYT2CaeITBDVC9GYfFcdHjSHSPI1h_zOxRZF27IQCteBVzBWT0lGHFcLoYU12hcEvdiUXOxTszA9NlRGGoX8LZApAJ1PUUGB-QQWgx3YuA4JAa26sOCUfiljqmEz188nn067wpBrCwxfuVYGKFoHu43amyKPos1DCKswSaP6R6j5Yy84I6MDVLuphTxeUE91pNlKUn5XyjtwIsYJ7jNmg0klcVxICZinvV-rhI9r4c5jT5_RC2JdWbQ4iN4VE9g" />
                                </div>
                            </div>
                        </div>
                    </div>
                </header>
                
                <div className="pt-20 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-8 mb-20">
                    {/* Sidebar Navigation */}
                    <aside className="hidden md:flex md:col-span-3 flex-col gap-4 sticky top-24 h-[calc(100vh-120px)]">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl flex flex-col gap-2">
                            <a className="flex items-center gap-3 bg-white dark:bg-slate-900 text-green-600 dark:text-green-400 rounded-xl shadow-sm px-4 py-3 font-bold transition-all duration-300" href="#">
                                <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>home</span>
                                <span className="font-label">Trang chủ</span>
                            </a>
                            <a className="flex items-center gap-3 text-slate-500 dark:text-slate-400 px-4 py-3 hover:translate-x-1 transition-transform hover:text-green-600" href="#">
                                <span className="material-symbols-outlined">event_note</span>
                                <span className="font-label">Lịch đặt</span>
                            </a>
                            <a className="flex items-center gap-3 text-slate-500 dark:text-slate-400 px-4 py-3 hover:translate-x-1 transition-transform hover:text-green-600" href="#">
                                <span className="material-symbols-outlined">notifications</span>
                                <span className="font-label">Thông báo</span>
                            </a>
                            <a className="flex items-center gap-3 text-slate-500 dark:text-slate-400 px-4 py-3 hover:translate-x-1 transition-transform hover:text-green-600" href="#">
                                <span className="material-symbols-outlined">person</span>
                                <span className="font-label">Tài khoản</span>
                            </a>
                        </div>
                        {/* Sidebar Extra: Gần nhất có thợ nào */}
                        <div className="bg-surface-container-low p-5 rounded-2xl flex flex-col gap-4 mt-2">
                            <h3 className="font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">near_me</span>
                                Thợ gần bạn
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white overflow-hidden border border-outline-variant/10">
                                        <img alt="Worker" data-alt="Technician professional headshot" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmdZ__rK-UCtKu7bPQPs7U4H_6EdgUcLjc9diqhUAYhtNdGZ9LfSdGHq2lZSFneMTjt4B_iAL8-UWeRUFsFkeHR-6OCwZ8byosXQJ8xRO2I-tuf3FRY-ng429qijvnPbXgFoorsIfMQlPCmwsOhBffJ48ZgfiSf4863Ygymq2g9pVr68wuNhGL7dqSinadqHLqNyUBh1HkZ5rp9tZXAlbms3O79_NAwuAtKokI6e3YCV2Ror9FQy3GNndf5kJgbqDdCMeJeDeGsWI" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">Trần Văn Nam</p>
                                        <p className="text-xs text-on-surface-variant">Sửa điện • 500m</p>
                                    </div>
                                    <span className="text-xs font-bold text-primary">● Online</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white overflow-hidden border border-outline-variant/10">
                                        <img alt="Worker" data-alt="Worker in professional uniform" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTfwdnRgNqOQ6a-Pw-mUF7OVlDbTxUsC9lt66Xk1N5Dom2Xlrc_PsJxQywsT1w0Ioi6aRqMg45vcb2ztV1fKtwdUobXHSUS7YGLW25LCej70fGQNsOiINTegLU73HRqFbmlNarQjZUelnljLkawkK3i05dtuIT19Vy1ML1B502aJn-JZ_JkHZBp3rPFSQXf-TT0afxygKEC8K9-45ss7jXFNShDrm-L7zOI8RIQ35yxYq-BUVB5r6h8gaPgKqtkjag0bV4PQdY6dU" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold truncate">Lê Thị Hoa</p>
                                        <p className="text-xs text-on-surface-variant">Vệ sinh • 1.2km</p>
                                    </div>
                                    <span className="text-xs font-bold text-outline">Vừa mới</span>
                                </div>
                            </div>
                            <button className="w-full py-2 bg-secondary-container text-on-secondary-container rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">Đặt
                                lịch ngay</button>
                        </div>
                    </aside>
                    {/* Main Content */}
                    <main className="md:col-span-9 space-y-12 pt-10">
                        {/* Hero Banner */}
                        <section className="relative h-64 md:h-80 rounded-3xl overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-container" />
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBxBEghTMQupsUOEySGZHgBtQKhniHuGzHpOHnCMHRqEucNiFdTgeerXaqmDJyMXEimBHYt_g31j17l1VIDzOpcDrf1M8bSqDEz-erCc8IiXXrSg9th9ljaNZUhPj5zFtQloDrI30DiqpzJQzW46ElcDMytIYQOtbdplJX6ybaAF8rJiHZ87iuWOjTTNVf9hxsGO6bh6y_2CnhpsvZypR_PNyPdUyBu4SOsnEUWWQh_b8v4GEBSwLwV6i9EH46uPUPSz8UUKk0esaI")' }}>
                            </div>
                            <div className="relative h-full flex flex-col justify-center px-8 md:px-12 text-on-primary">
                                <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold w-fit mb-4">CHƯƠNG
                                    TRÌNH SSBP</span>
                                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">Ưu đãi 50%
                                    <br />cho người mới</h1>
                                <p className="text-lg opacity-90 max-w-md mb-6 font-medium">Trải nghiệm dịch vụ chuyên nghiệp chuẩn 5
                                    sao từ Vua Thợ với mức giá không tưởng.</p>
                                <button className="bg-surface-container-lowest text-primary px-8 py-3 rounded-xl font-bold w-fit hover:shadow-lg transition-all active:scale-95">Nhận
                                    mã ngay</button>
                            </div>
                            <div className="absolute right-0 bottom-0 top-0 hidden md:block w-1/3 overflow-hidden">
                                <img alt="Repair" className="h-full w-full object-cover transform scale-110 group-hover:scale-100 transition-transform duration-700" data-alt="Professional electrician repairing a panel box" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5nThQ3G1Xld7y3pMHapAAzqjmughUheacP8tEqFFZZUJEVANXMXsBV9r7_XaavjtCEkmDqL9DopslsIvlW2GA_JEQS0GUF-8t16mx6RMSrwe5KBF2RsUsYTNHaV8xpq5CaNcRVd60wPUUKgZXEs0fKLFO7dmVD723p2LjpVL7nRJjXiGAV7kF5TzpZgcoctv5IK8R2XS7h8uXoe2wWus3RGo6lMGL--CtY-ziWlmeFAmqF_NB9LrkEFlYSp8kJGkE_Fys_xh0G2o" />
                            </div>
                        </section>
                        {/* Category Grid */}
                        <section>
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Danh mục dịch vụ</h2>
                                    <p className="text-on-surface-variant text-sm">Tìm kiếm chuyên gia phù hợp cho ngôi nhà của bạn</p>
                                </div>
                                <a className="text-primary font-bold text-sm hover:underline" href="#">Tất cả</a>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">bolt</span>
                                    </div>
                                    <span className="font-bold text-sm">Sửa điện</span>
                                </div>
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">water_drop</span>
                                    </div>
                                    <span className="font-bold text-sm">Sửa nước</span>
                                </div>
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">cleaning_services</span>
                                    </div>
                                    <span className="font-bold text-sm">Vệ sinh</span>
                                </div>
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">face</span>
                                    </div>
                                    <span className="font-bold text-sm">Làm đẹp</span>
                                </div>
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">school</span>
                                    </div>
                                    <span className="font-bold text-sm">Gia sư</span>
                                </div>
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">ac_unit</span>
                                    </div>
                                    <span className="font-bold text-sm">Máy lạnh</span>
                                </div>
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">local_laundry_service</span>
                                    </div>
                                    <span className="font-bold text-sm">Giặt ủi</span>
                                </div>
                                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white">shield</span>
                                    </div>
                                    <span className="font-bold text-sm">Bảo vệ</span>
                                </div>
                            </div>
                        </section>
                        {/* Popular Services */}
                        <section>
                            <div className="flex justify-between items-end mb-6">
                                <h2 className="text-2xl font-bold tracking-tight">Dịch vụ phổ biến</h2>
                                <div className="flex gap-2">
                                    <button className="p-2 bg-surface-container-low rounded-full hover:bg-surface-container-high transition-colors"><span className="material-symbols-outlined">chevron_left</span></button>
                                    <button className="p-2 bg-primary text-white rounded-full hover:bg-primary-container transition-colors"><span className="material-symbols-outlined">chevron_right</span></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                {/* Service Card 1 */}
                                <div className="bg-surface-container-lowest rounded-3xl overflow-hidden hover:shadow-xl transition-all border border-outline-variant/10 group">
                                    <div className="h-44 overflow-hidden relative">
                                        <img alt="Service" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="Technician servicing an air conditioning unit" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnkIdh-iJTt9pYUXH0vNBFKPq2ONcwiPn3HGCI3OSMH-80dTF8SpZWFTbGMkr1slpqusTp_SsgQdq1a21mj7CRVkEz8gqY09UP-k7vv9oau3dKjPW5KUnz5iign8aQ8uRsyKcFlBfYd9CnnH8ipD2yD_jnEcd4PUQaVmKplqfnKpO2MqUcWndKjNDcTLcWVE4Tjs9NGlpbrr9XPrJUv_QG58QW3mx0NrIPjoTYgRGQCXkZo0V50XCbut1DzY4lGRp8KDtyPFacLkM" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                            <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                                            <span className="text-xs font-bold">4.9</span>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-lg leading-tight">Vệ sinh máy lạnh (Dòng Inverter)</h4>
                                        </div>
                                        <p className="text-on-surface-variant text-sm flex items-center gap-2">
                                            <span className="material-symbols-outlined text-xs">history</span>
                                            1,200+ lượt đặt
                                        </p>
                                        <div className="flex justify-between items-center pt-2">
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Giá từ</p>
                                                <p className="font-black text-primary text-lg">150.000đ</p>
                                            </div>
                                            <button className="p-3 bg-secondary-container text-on-secondary-container rounded-xl hover:opacity-90 active:scale-95 transition-all">
                                                <span className="material-symbols-outlined">add_shopping_cart</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Service Card 2 */}
                                <div className="bg-surface-container-lowest rounded-3xl overflow-hidden hover:shadow-xl transition-all border border-outline-variant/10 group">
                                    <div className="h-44 overflow-hidden relative">
                                        <img alt="Service" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="Electrician checking wires in a residential house" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNB8RIxlsJcxrDEncZzXNEf0C9jRlq99-aS5Q6JOwq7SuvHxJy6Q-7ppNjttC-HcayN22Z73kIqFYykfsou4y5CGOHkcNbHVTpSwCNT9tqknfn60grtCm42tzX6v_0C8a2UOPA0zrura8KHoy67ZM_Pu7qNvaVjXH2k-nr2F3LyuBxd78CSj_tmD2hukytkYvUnfRiz_58c_1dTB3glWW4n4MLa1_VMk4bIZ2sTGS1Z_RWRCLXoyIADEFFtbIo5Y-5cQ2YWWjHUhk" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                            <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                                            <span className="text-xs font-bold">4.8</span>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-lg leading-tight">Sửa chữa điện gia dụng tại nhà</h4>
                                        </div>
                                        <p className="text-on-surface-variant text-sm flex items-center gap-2">
                                            <span className="material-symbols-outlined text-xs">history</span>
                                            850+ lượt đặt
                                        </p>
                                        <div className="flex justify-between items-center pt-2">
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Giá từ</p>
                                                <p className="font-black text-primary text-lg">200.000đ</p>
                                            </div>
                                            <button className="p-3 bg-secondary-container text-on-secondary-container rounded-xl hover:opacity-90 active:scale-95 transition-all">
                                                <span className="material-symbols-outlined">add_shopping_cart</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Service Card 3 */}
                                <div className="bg-surface-container-lowest rounded-3xl overflow-hidden hover:shadow-xl transition-all border border-outline-variant/10 group">
                                    <div className="h-44 overflow-hidden relative">
                                        <img alt="Service" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" data-alt="Cleaning professional working on bathroom tiles" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVX9hxAMW9H1S5aTg52K3SYbFbOEsMANnfZGI_2zHAHORBIZIX4erbHgIelx177AJ2W_m1rqQPLzlfa9chFFaFezj-qToJP58FMQbTTaBT1et4rxPuQ4TLHhXK9o0ctcH7tu-AlvoteKd8UWgJqXwGqiSbnKpA5XMTWvRBWM_lLD9vcwZSRllArNjR6_jt8kIFMooXWUJ17GeMcwU_YoKwSTkE7r2MO5T96XbGICTptSmH6xvUvOyCE8FSEsUyuy0iX3G8UQrgdpY" />
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                            <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>star</span>
                                            <span className="text-xs font-bold">5.0</span>
                                        </div>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-lg leading-tight">Vệ sinh bồn nước và bể chứa</h4>
                                        </div>
                                        <p className="text-on-surface-variant text-sm flex items-center gap-2">
                                            <span className="material-symbols-outlined text-xs">history</span>
                                            560+ lượt đặt
                                        </p>
                                        <div className="flex justify-between items-center pt-2">
                                            <div>
                                                <p className="text-xs text-on-surface-variant">Giá từ</p>
                                                <p className="font-black text-primary text-lg">350.000đ</p>
                                            </div>
                                            <button className="p-3 bg-secondary-container text-on-secondary-container rounded-xl hover:opacity-90 active:scale-95 transition-all">
                                                <span className="material-symbols-outlined">add_shopping_cart</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </main>
                </div>
                {/* Footer */}
                <footer className="w-full border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 mt-20">
                    <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-4">
                            <span className="text-lg font-bold text-green-600">Vua Thợ</span>
                            <p className="text-slate-500 font-manrope text-sm leading-relaxed">Hệ sinh thái dịch vụ thợ chuyên nghiệp
                                hàng đầu Việt Nam, mang đến chất lượng và sự an tâm tuyệt đối cho khách hàng SSBP.</p>
                            <div className="flex gap-4">
                                <a className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all" href="#"><span className="material-symbols-outlined">social_leaderboard</span></a>
                                <a className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all" href="#"><span className="material-symbols-outlined">alternate_email</span></a>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-3">
                                <h5 className="font-bold text-sm mb-2">Dịch vụ</h5>
                                <a className="text-slate-500 hover:text-green-500 font-manrope text-sm underline decoration-green-500/30 underline-offset-4" href="#">Dịch vụ sửa chữa</a>
                                <a className="text-slate-500 hover:text-green-500 font-manrope text-sm underline decoration-green-500/30 underline-offset-4" href="#">Vệ sinh máy lạnh</a>
                                <a className="text-slate-500 hover:text-green-500 font-manrope text-sm underline decoration-green-500/30 underline-offset-4" href="#">Giặt ủi</a>
                            </div>
                            <div className="flex flex-col gap-3">
                                <h5 className="font-bold text-sm mb-2">Hỗ trợ</h5>
                                <a className="text-slate-500 hover:text-green-500 font-manrope text-sm underline decoration-green-500/30 underline-offset-4" href="#">Về chúng tôi</a>
                                <a className="text-slate-500 hover:text-green-500 font-manrope text-sm underline decoration-green-500/30 underline-offset-4" href="#">Điều khoản sử dụng</a>
                                <a className="text-slate-500 hover:text-green-500 font-manrope text-sm underline decoration-green-500/30 underline-offset-4" href="#">Tải ứng dụng</a>
                            </div>
                        </div>
                        <div className="bg-surface-container-low p-6 rounded-2xl">
                            <h5 className="font-bold text-sm mb-4">Ưu đãi độc quyền SSBP</h5>
                            <p className="text-xs text-on-surface-variant mb-4">Đăng ký email để nhận được những thông tin khuyến mãi
                                sớm nhất từ Vua Thợ dành riêng cho khách hàng SSBP.</p>
                            <div className="flex gap-2">
                                <input className="flex-1 bg-white border-none focus:ring-1 ring-primary rounded-xl text-xs" placeholder="Email của bạn" type="email" />
                                <button className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold">Gửi</button>
                            </div>
                        </div>
                    </div>
                    <div className="max-w-7xl mx-auto px-8 py-6 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-slate-500 font-manrope text-sm">© 2024 Vua Thợ. Tất cả quyền được bảo lưu.</p>
                        <div className="flex gap-6">
                            <span className="text-slate-400 text-xs">Chính sách bảo mật</span>
                            <span className="text-slate-400 text-xs">Hỗ trợ 24/7</span>
                        </div>
                    </div>
                </footer>
                {/* BottomNavBar Mobile Only */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-6 py-3 z-50 flex justify-between items-center">
                    <a className="flex flex-col items-center gap-1 text-primary" href="#">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>home</span>
                        <span className="text-[10px] font-bold">Trang chủ</span>
                    </a>
                    <a className="flex flex-col items-center gap-1 text-slate-400" href="#">
                        <span className="material-symbols-outlined">event_note</span>
                        <span className="text-[10px] font-bold">Lịch đặt</span>
                    </a>
                    <a className="flex flex-col items-center gap-1 text-slate-400" href="#">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="text-[10px] font-bold">Thông báo</span>
                    </a>
                    <a className="flex flex-col items-center gap-1 text-slate-400" href="#">
                        <span className="material-symbols-outlined">person</span>
                        <span className="text-[10px] font-bold">Tài khoản</span>
                    </a>
                </nav>
            </div>

        </>
    )
}

export default CustomerPage