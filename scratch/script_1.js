
        function showToast(text, isError = false) {
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toast-icon');
            const textEl = document.getElementById('toast-text');
            if (!toast || !textEl) {
                alert(text);
                return;
            }
            toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 transition-all duration-300 z-[100] border ` + 
                (isError ? "bg-rose-900/90 border-rose-500 text-rose-100" : "bg-slate-900/90 border-slate-700 text-white");
            if (icon) {
                icon.textContent = isError ? "error" : "check_circle";
                icon.className = isError ? "material-icons text-rose-400 text-base" : "material-icons text-emerald-400 text-base";
            }
            textEl.textContent = text;
            toast.classList.remove('hidden');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000);
        }

        const serverSessionToken = '5562be5a-7fe3-4be8-8941-ab6f208e0a3c';

        // Interceptor de seguridad: Inyecta automáticamente el token de administración en todas las peticiones a /api/admin/
        const _nativeFetch = window.fetch;
        window.fetch = function(url, options) {
            options = options || {};
            if (typeof url === 'string' && url.startsWith('/api/admin/')) {
                options.headers = options.headers || {};
                const currentToken = sessionStorage.getItem('admin_verified') || serverSessionToken;
                if (currentToken) {
                    if (options.headers instanceof Headers) {
                        options.headers.set('X-Admin-Token', currentToken);
                    } else {
                        options.headers['X-Admin-Token'] = currentToken;
                    }
                }
            }
            return _nativeFetch(url, options).then(response => {
                if ((response.status === 401 || response.status === 403) && typeof url === 'string' && url.startsWith('/api/admin/')) {
                    sessionStorage.removeItem('admin_verified');
                    const overlay = document.getElementById('pin-overlay');
                    if (overlay) overlay.classList.remove('hidden');
                    const content = document.getElementById('admin-main-content');
                    if (content) content.classList.add('hidden');
                }
                return response;
            });
        };
        let orders = [{"id": 10, "tableNumber": "Mesa 8", "status": "DELIVERED", "totalUsd": 4.3, "paymentMethod": "Punto de Venta: $4.30", "paymentStatus": "PAID", "paymentReference": "", "paymentOriginBank": "", "paymentPhone": "", "paymentVerificationStatus": "NONE", "orderType": "DINE_IN", "notes": "Papitas fritas", "timestamp": "2026-08-27 01:52 PM", "items": [{"productId": 7, "productName": "Papelón con Limón", "quantity": 1, "priceUsd": 1.5}, {"productId": 8, "productName": "Quesillo Tradicional", "quantity": 1, "priceUsd": 2.8}]}, {"id": 9, "tableNumber": "Mesa 7", "status": "DELIVERED", "totalUsd": 19.5, "paymentMethod": "Pago Movil", "paymentStatus": "PAID", "paymentReference": "6555", "paymentOriginBank": "Mercantil", "paymentPhone": "75565544", "paymentVerificationStatus": "VERIFIED", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-27 01:40 PM", "items": [{"productId": 1, "productName": "Pabellón Criollo", "quantity": 1, "priceUsd": 8.5}, {"productId": 2, "productName": "Asado Negro", "quantity": 1, "priceUsd": 9.5}, {"productId": 7, "productName": "Papelón con Limón", "quantity": 1, "priceUsd": 1.5}]}, {"id": 8, "tableNumber": "Mesa 7", "status": "DELIVERED", "totalUsd": 3.5, "paymentMethod": "Pago Móvil: $13.50", "paymentStatus": "PAID", "paymentReference": "", "paymentOriginBank": "", "paymentPhone": "", "paymentVerificationStatus": "NONE", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-27 01:36 PM", "items": [{"productId": 4, "productName": "Tequeños de Queso (5 uds)", "quantity": 1, "priceUsd": 3.5}]}, {"id": 7, "tableNumber": "Mesa 7", "status": "DELIVERED", "totalUsd": 10.0, "paymentMethod": "Pago Móvil: $13.50", "paymentStatus": "PAID", "paymentReference": "", "paymentOriginBank": "", "paymentPhone": "", "paymentVerificationStatus": "NONE", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-27 01:36 PM", "items": [{"productId": 1, "productName": "Pabellón Criollo", "quantity": 1, "priceUsd": 8.5}, {"productId": 7, "productName": "Papelón con Limón", "quantity": 1, "priceUsd": 1.5}]}, {"id": 6, "tableNumber": "Para llevar", "status": "READY", "totalUsd": 6.0, "paymentMethod": "Pago Movil", "paymentStatus": "PAID", "paymentReference": "7654", "paymentOriginBank": "Mercantil", "paymentPhone": "75565544", "paymentVerificationStatus": "VERIFIED", "orderType": "TAKEAWAY", "notes": "Con todo", "timestamp": "2026-08-27 01:29 PM", "items": [{"productId": 8, "productName": "Quesillo Tradicional", "quantity": 1, "priceUsd": 2.8}, {"productId": 9, "productName": "Tres Leches", "quantity": 1, "priceUsd": 3.2}]}, {"id": 5, "tableNumber": "Mesa 7", "status": "CANCELLED", "totalUsd": 2.5, "paymentMethod": "Punto de Venta", "paymentStatus": "REFUNDED_OR_CANCELLED", "paymentReference": "", "paymentOriginBank": "", "paymentPhone": "", "paymentVerificationStatus": "NONE", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-27 01:18 PM", "items": [{"productId": 6, "productName": "Chicha Criolla", "quantity": 1, "priceUsd": 2.5}]}, {"id": 4, "tableNumber": "Mesa 7", "status": "CANCELLED", "totalUsd": 7.5, "paymentMethod": "Punto de Venta", "paymentStatus": "REFUNDED_OR_CANCELLED", "paymentReference": "", "paymentOriginBank": "", "paymentPhone": "", "paymentVerificationStatus": "NONE", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-27 01:14 PM", "items": [{"productId": 7, "productName": "Papelón con Limón", "quantity": 1, "priceUsd": 1.5}, {"productId": 8, "productName": "Quesillo Tradicional", "quantity": 1, "priceUsd": 2.8}, {"productId": 9, "productName": "Tres Leches", "quantity": 1, "priceUsd": 3.2}]}, {"id": 3, "tableNumber": "Mesa 7", "status": "DELIVERED", "totalUsd": 6.5, "paymentMethod": "Punto de Venta: $6.50", "paymentStatus": "PAID", "paymentReference": "5444", "paymentOriginBank": "Tesoro", "paymentPhone": "64987688", "paymentVerificationStatus": "PENDING_VERIFICATION", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-27 01:06 PM", "items": [{"productId": 4, "productName": "Tequeños de Queso (5 uds)", "quantity": 1, "priceUsd": 3.5}, {"productId": 5, "productName": "Empanaditas de Cazón (3 uds)", "quantity": 1, "priceUsd": 3.0}]}, {"id": 2, "tableNumber": "Mesa 7", "status": "DELIVERED", "totalUsd": 14.0, "paymentMethod": "Pago Movil", "paymentStatus": "PAID", "paymentReference": "5444", "paymentOriginBank": "Tesoro", "paymentPhone": "64987688", "paymentVerificationStatus": "VERIFIED", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-27 01:02 PM", "items": [{"productId": 2, "productName": "Asado Negro", "quantity": 1, "priceUsd": 9.5}, {"productId": 3, "productName": "Arepa Reina Pepiada", "quantity": 1, "priceUsd": 4.5}]}, {"id": 1, "tableNumber": "Mesa 1", "status": "DELIVERED", "totalUsd": 8.5, "paymentMethod": "Punto de Venta: $8.50", "paymentStatus": "PAID", "orderType": "DINE_IN", "notes": "", "timestamp": "2026-08-26 06:09 PM", "items": [{"productId": 1, "productName": "Pabellón Criollo", "quantity": 1, "priceUsd": 8.5}]}];
        let products = [{"id": 1, "name": "Pabellón Criollo", "description": "Delicioso plato tradicional venezolano con arroz blanco, caraotas negras guisadas, carne mechada jugosa y tajadas de plátano frito.", "priceUsd": 8.5, "categoryId": 1, "stock": 27, "isAvailable": true, "imageUri": "data:image/jpeg;base64,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", "modifiers": []}, {"id": 2, "name": "Asado Negro", "description": "Muchacho redondo horneado lentamente en un almíbar de papelón caramelizado con vino tinto y especias.", "priceUsd": 9.5, "categoryId": 1, "stock": 23, "isAvailable": true, "imageUri": "data:image/jpeg;base64,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", "modifiers": []}, {"id": 3, "name": "Arepa Reina Pepiada", "description": "Arepa de maíz tostada rellena de ensalada cremosa de pollo desmechado, aguacate maduro, mayonesa casera y un toque de cilantro.", "priceUsd": 4.5, "categoryId": 1, "stock": 99, "isAvailable": true, "imageUri": "data:image/jpeg;base64,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", "modifiers": []}, {"id": 4, "name": "Tequeños de Queso (5 uds)", "description": "Deditos crujientes de masa rellenos de sabroso queso blanco llanero fritos al momento. Se acompañan con salsa de ajo.", "priceUsd": 3.5, "categoryId": 2, "stock": 58, "isAvailable": true, "imageUri": "data:image/jpeg;base64,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", "modifiers": []}, {"id": 5, "name": "Empanaditas de Cazón (3 uds)", "description": "Empanadas de masa de maíz dulce rellenas de cazón (tiburón pequeño) desmechado, sofrito y frito.", "priceUsd": 3.0, "categoryId": 2, "stock": 39, "isAvailable": true, "imageUri": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAC0AToDASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAAAwQCBQYAAQf/xAA6EAABAwMDAgUDAgQFAwUAAAABAAIDBBEhBRIxQVEGEyJhcRQygVKRI0JioQcVFpLRJDOxQ1NywfD/xAAaAQACAwEBAAAAAAAAAAAAAAACAwABBAUG/8QAJxEAAgIBBAEEAgMBAAAAAAAAAAECEQMEEiExQRMiMlEFYRRCkXH/2gAMAwEAAhEDEQA/ALGZxN8qj1BgcTcq7c291Tajdl9w/K4+llui2a5qmVZicw3DsI0c5byoNmBwQm6OjFbUxwM5ebXWtukCGp4pqx22GBzz/SFYxeGq6Q5i2n3ctfpemR6dSNgibgcnqSnzCLX6rBLVSvhDljRkYPCk7SN9Q0e1kyfDZaRabHVaQRhebMpX8nIwvTiZ/wDyE7vS6wXM0aRpzLhX5ZbhRRLUT+y9qKb6GWPqCvG0jnjLQFcOZuyhuZYWUefIvJNkSl+hmZJdpB7hKaiXxRFx3XC0AZtzZRlhY9pBaCCpHVz8keNGRhr/ADYy03uAquerdS1JJcQCVsJtFp53ki8Z7tVLqnhSeZ14pgR/UijqbAeOikrKxskW5j9zkvBqFRINjYy5xxgLVaZ4Qp4Wh0z97uoV9BpVHTNtHC1O9dVwDsZ88ptA1Grn81wLGk5urmLwbE57XTuce4utj5TWj0gBCc0rJk1GTwzRHHHyZs+E6Rrg5twR7p2HSYYGYcVZuuRayXlaSVkyavJFdjY4otgPIY0WaThCqKNsrLXIT8NOCbuK9mpyOOEH8jK42w3jhYlDRRiK1/woGjcGFocbJlzCxuEIvPdBHXyhw0C9On0fPdc06q03U/rKfc43uRZbXw9rlRV6e0va5pI4KPLTxT33MBUqVrKU7RELey24fyUZOpqhc9K0uGKxa2abUiyRpBJwU9rHiEU1A+Q3wLqs1Wop2VDXPba5Tk1LTalp21tjcLsQnGStGKUWnTPnGl+LpotddUSO/hSOwOy+uabrENZStdvBuF8d1XwvPDqfl049Dzn2X0XQdIdS6axhecN6p0q8AKzzVGUcuqse8guacZWiirYYqZpD8W7rB6rppdqrT5zgQehV3LQTnTv4cpvblCWUPjHxj5MjYach0g562Wg8KeIYq6iYN1jbK+S6tp9TDqb2P3Pc92Ctv4O0OopYN7yQXZt2RySSATdmy1yaCalLXPBBHdK6D9JSQHY4NA91Ra1BNLM2MSlrSeh5T1Lpj4qD0vPCAM88T+J2UsBax93HACwP+oK39aa1PTaqp1RzblwPBPRPDwoNo9PRGqK5Nw703uFTapMy1jZXu5puCs/rFM0vLmEfCxaTF6eOmHN2xFjoJOgWi8JU8R1B8tvsbg+6oaPSZZyLOsFqtC0uXT5jLvu0ixCZmi3B0SL5NfEAGXUyLocLw5gRgcLltGghtKiUaygW4S3CiJgwLqJYAcKew3UX3thFHhEBvNsWQi72RyENzcK3yQHu9kNx7BelriV6BY5Sr5DQIi32nKg8uIsjlreQAokNtYHKpqy0V5qHMkIbZesrn7vVwmDTBtzYZQZIQeyy1lXkfcRiKeJ32nKIADlVRgLH33H8IrKlwdtdj3TY5G+JIBx+h123KAYxcuXeaDbKl5gsidSKVoGHEG6m5+5iG97bYUd7dqquCzx7dwKVLLOtdMidtiLpKV9pb3WbLjT5Gxkwm3y3CxuCoveG5KXmnslC6oq37IWFxv0UjDxFBX9g9TY2su1ouVX0NRW0W6ItdYcLY6doJjj3TC7iMoz9HZuJ2j9l39Hjljh7jnZ5qT4PnGo1tSyrEzoHbVcUniRxo7Na7hX9doccrfs/skY9BZEDZvPst1mcwWs61VP1Zsrbtaw8d1qqDxI36MCQ2xm4U6zwtFNKHOblev0BohLbWwitMqmZms1aml1ISixsebLRx+IYIKMbTbHICr4/DDfOuW4+FYS+HWOi22tjoo2iUzKVeuVVdqbXR3EbHdFomeJfJpNj7g2xhGpfDkNP/Ln4Xs2isfICRcDhS0Tkp4658lR5xYQ3uQrH/O3dk99BCyICw/ZLfTx9lLRdFt9SC02GUsKR1bJlrrKzrKJtHE57nAAKemV1M+L0OBNkLlGKIk2e0VHBTOA22Puna2tbRwbwBYDusjrmsSwagwMedo5svavWGz0G0uzbus889dBqDNR4d8Swahuhd6JWmwB6haVkm5fC4JqqKr8yl3gh1wV9W8N6vJX0LDUM2TAWcFzsvEuPJoiuDSBwXtroQNxcKTXKL9g0SICE4WPKISUKQm2OUEpJItIhfKi4diFDcQ71LwuuUj1Bu09IJJKG4XNwML18h4CiJA02tlV6qumTayJwfZSG3tldcF2SF6AHZBwijL6KaOLQcpWoi9QKaavHC/CNq0UnQq2G/wALySnaG2AvdM8Cx5QZAT9pQypIJN2V0tNK0XaTbsgumljFngj5VoQb2K6SGOVm1zQQlbf2N3FQyo3HJwvJakcBwBQ9ToHU95qe5YMuHZU31PqBc4oG5VQaSZbmoDGG5ykJK6xNyqyv1mGmYbm5t3Wak16Z8u5oxfGVow6TJl58C55Y4z6Pp9BPqLgXYj/8rW0OmQ0sY2sF/hfLNI/xA+haGzQPsP0laak/xO0x9hI9zD7tXYw6WOJfswzzOZu9o7KDogc2CoKXxvpNT9tXEb9N2VZRa5RTAbZm57FaUhVjD6dpHCA+jb2TDauF49LxlSL2kYIKlEK19EO2ECShuOFakqDlKLKZ1CBw1QNMR0Vu5t+iGWXUohTugI6IMkQA4VzJDdLupC/nhSirM5VEN56Kt8z3C1FTpG+9glP9PfClEsR17WfPoyGm5IsszpeoyQXbkklXMeg1ErQJnG3YJyPSqOiZd20W5XGWd5FtXLNW1R7M9U01RqcoLWEC/JTtJ4ftYzPx84T02owQAthblIzajPLi5AWmGmyzXudIB5Uui3jpqClaC4jCNFrlNSSt8sGxObLNukLjkkn5XhcU6GgxR5fLAeWTPq9BVtqYWua64cLgpsLD+EdSsH0sj/UMsHstox3pCw5IvHLaxye5WFJyvCFEG7giH8pS5L6F3RAe5QrWTEgPRKyh4GBcrNl9vSGw5IPIJ7KDmEX2nnuplhfbcLBTMYLebWSNu7tDboC2MtO6274KIH2bx8qLgWHBUDJgk8ItygqJW44PGcr0Sbf5klNOQ64H4XschkGeUuGpt0FLE0iwsHNzz3QHNDTawPvdSY7Fl4/IPdbXJNGeqO2g5/deOw7GQujLtpDzdegXyOELplgZGNe1wc24OCFg/FlDUae5klEHGKS4I/QV9BkbwVX19IJ4HNIuCEKyPHLdVhrlVZ8ffp1dUuu9tye6kdCrQ2+y/stiR9PK5jm2LT1CNHUNOMLetfNLhcCXp4t8mCk0utjHqgdZKview2ewg+4X0wGF/LQfwoS6dSVOHRt/ZMh+TX9kBLS/TPmrU7Rmpa4bJnt+HFa6XwlSvJdHj4Sp8PzUzvQy7Qt2PV4snkzywziS07UdQgA/6l5t0Jur6m8SVcYG8397qhET4zZzSPwiBy1Kn0L6NbT+Kmut5gIKsodepZbesA/Kwe5eh9lNpLPozK2CQXDgpiVncL57HWTx22vcnoNbmZh2VVENqJGldvCzEOuh2CU/T1onNg7lVRC0fOwY6qV2pRkBcbpsROsrIYis8QF5LKcBo7hVUlRLMSXvJv7pUOAUw4HlKhjjjVRVDG2+yYsQvQwFRaL8KQBCZYJHZZdtKJ0XK7Ko6nlfTTsnjJDmG+F9K06uFVTRyfqANlhNI0819W1pB2NySt1HTCCIGMfaOAuXrmm1XZpxKiwjeC4BMjLFXxPuAU3E491jhLwMkglr8ob2dQi3uvLH2RSSYKdCzgAhukGQ3lHf6UAsJubrJPh0h0QD2E5JulZ3FosMX6JqZpcLHHwgFrxjn3Kw5k/o0QESBe5F+llMExgEYRHM2kXC8kN7AjCxr/o5uwsVRcjcjOcCOcJKMFp9imWAmwNrLZgzN+1iMkAwALQQbrxkgBs7BXAeW7H2rnNFwbZXR7M5M7T1QZI92CpHBwUS7bWtlDJKXDLTaMr4i00loqYhluHgdu6z7fT1K31QwSNc13BwVhq2AwVcsQPpa4gX7KovwNTOjcT1TkT8ZKrd5aLBSZK4O5KqULGIu4pOMp6MNc3ICpqaW9rlWUUg22us6k4Mko2FlooZW32hIS6XATa1vhWbJReylJE17Vsx6ma+LEPEvKM/PphY28Zv7JA3aS0ixHRabyS3NsKvrtOdUOL4rNK6Wm1rvbkM+XAu4lWHL1LySmCQxSAhwU2Sh3C6yaatGPoMDbhHgqJojdryEFrHO4CajpnG1xZEQtaPXXssJMhXI1qG3KzUdKBYWTH0x/SUNEsyR5KkOFG3K9CAIm0kcKYkKG34UwfZQsIHA8qe4IYAITNFTtnrIojw5wBQydIs2Hh3ThS0TXkeqT1Eq/aQ0WS8LWxxtY22BhHaOq4eTJuk2bFGkLk+VJb+U8JqFxuhSxCRhHBGQUOKUjkZ4KSnyRosWuuVIuS0cl3W7I4F0zda4AaIvF0Bw2jJTVglqk+g7QCel0rIkluDi/AnUeZuHlEW63UWyBxDc3UpIy4Eg29lCIiOwsLlcvc9/PRrXxJOjBFyMpeQgC1wQmnuBzwl3MZJkut7KZopfFki35A/hHiiOTn2QwWxnCK2oBIaDcpeBRUrbLnZ13j7cW7ojZLi1sqBvcO3WA5BHKnuXWjwZmevZ14KgGk97BEe8FoXhfjAUmkUmBkaS3FllvEVMW1TJB/6jc44stc6xaQMKi8RBoo43OFyH2/cIEknwGmZcRE9EURkm1rKbXsuLdUZhDzYWRSYxM8iiP4VjHCWtC6GL0223KPu2kA3Cy5P2MTOaw3GEy1p2hesIsDyEYYORZXjjXQMmBPqbZQdECzHKbdHdtwMpeQOZlaEJbKat06Cqd/EbZ46pSLTBA/7btV1Ut35bypwizQJBlacGryYnXaFzxRmhKCNlrWCbYxmMIdTAAdzDb4QPrGxWa85XawamOZcdmPJicB8BrRgKW8dlWmva7he/VO7H9lqFUZUKYCm6H9KjtINiEoM9AFkRkYcbIYTEDHOdgKEPWw5yFZaVRufVNe0WDDe6nRURqJgOg5WjjpmU0B2ttYXVOFksbonmRzt3IVg22FSaZP50pcDYXtZXLDcYXnmtrcToPlJnPsTZLVbTGGyt4/msmmtz7rntvg8JaT7ICppA9gsfynA6x9lVWFJPa/od9pPQ9k2KljsXyUxZIxXPYLi2MSTsYLONiUu9+/hL7XSyuL22BA/CO2EBgDT+VilknlbVcBqKiQa3d934QZIw92BYjqnNm3ABt7obxboqeFVTCUhZsGF62IMJvlMHpbsgk+pU8MIFqbYOSnab2scHlCZSlguclMX7mynYWyFXpQb4C3sjEL4PC8e3J28qZuwAqDnDIv6rcLZGqoS+Txp9JDslRF78qA3NJz72UnPba7iGhBJryWjnutbBN+yqfEMZfQG38rwT8f/AIq2a9ruDceyQ1x1tMk2kcjn5VL7sLox7WOJyQAD1TULNzvSeq8bEZjcgBPUNIN+OUUuQrosaOCwG5MOp2XzlHp4PQpuiLc3S5w4JGQFsLSMdOiIWgjIypBtuEVsRLLjlXjvqipAS07fSUJ7HH0kJi4abXK54uL2uE6kxV0Vjow0ncFF7bAJwsG04ugvA7IWqCTE3lzgR1VHrLJnBhjaQ4FaeRjBH6efdJyMa4WdlHiyenNSKktyoqtKoZngOmvfsr4UGOFCjsfScEKz3C3C9NjayRtHNmnF0zCTU09O8iRjmn4UAb8rdz0ccwIkaHA9Cqer8OMdc07tp7HhVRRQNDSftF0dnSwCJJpdXAfVGbDqMo1Dp89RMGbS0dSQoiF5o9MRFvcLX4TmouMNHIR2TMMTY42sbgNFkjrri2jsODhXLhBLsqdIqjDUhpOHFa6BwNnDqsIy7XBw5BWg0vVA70SGzul1x8+LncjZGXFM0tkFziHLyjm3kglFmiDjcHKyyi3FNBJ06KbWZrBo6A3Khp04ffN+yh4gIiiuegVJ4c1eCqqpaUOBliyWg9FheOUpuX0arWw2zLObfupWu8AYCHD/ANoeyI2xxg5Wqr7MzPXW3ZKE+xuO6I97WNJPAVLrWuQaVEJqixJB2R3sXew91e2y4pvothGSLhV1RO4ZjLbbrc5xyht8T0Tg1sMwkNiXeWNwFuQHdSqCq1GeLUHRwWvIXOLgzdsPPF/dBqIJpRj2aMOOTuy8ZLO91mtPGbp+IOAsbH5VDRahUQtZ57hURSHD427SD/8AFWdJqkcshY4gHda18gjm4QYcEU/cysql4Q+5hAsR+EvLh1+E6+VrgL29kJ8QIuDgp2XHUqQhPjkAHtc3PTqhSsNi5ouj7QARt5Q7Hb6sLPlg5RoKLpiDHuZPZtx3QNaIOkyPccl7Ra3OU/KxocTwFReJKq0UNMw/c8vIHtwgxY3FUO+TEIy0uFhYq9oKcuAcB0VHRMdI9vutdQxeVG0dU2PyKnwFjBY3hSaQ7Nky1oXGJtsDKa4tiNwGzeyi4bSS05TDWi3v2Q3Nz3V1SJYvIwkC/KXc9zHn9PZOSAtHsl3bZGkdQga+i0wV8AoZaHgu/wDCm8OHTA5Qw31XHCHyWQl2gHA46qqdMblpFinpZCJjcYVdXyQuDyHAOPfohachkaXYvNqX0LxLyDjlef6rPYfusjrOqh+2GN27ackKs+pf7r0WjjKOJJnOztOfB9xDSHELiFhaHxFX0VmOd58YPDuR+VpaDxLQ1gs9/kyfpfi60pimqLQtB6KUbQ04C8icyZm6Nwc3uCpC7eUQIYD9ktqMAmpXA9Mo4fYIdZK1tK435Cj6LRk2izyPdT/t8Ly13ly9GViY8PSalPRzbrue3qCrdni2gAIqHPjsOS26oNtzZAnp9zTYIJYYyJvaEfGnjRtXCKXS2vN/vkcwi3wsl4YqqnTNfgrLPLC7bKe7StPNA3cdzR+yB5bWjAAToYoxg4ryU8jbs+o09T5sXpNwRcJqIlwBHXlZDwvqe5jqaV13s+2/JC1EVRtYXY5XFlB457ZGpPcuAWo1LomtYwsDnAkh39liPEEs40r/ADOH+JMRZ0h/kHt8K38Q172h7onXlf6Gt5SooYvLdpzj5kMrvsfxuPIH9/7oMbW7czZjjtiZzwu2aaJssk00VLTNc4F2GSOdg2725V7Q0UepRSGNzyC8HzA/aHgHg36fH5ScNNW61VeVcQ0EDhG0MwZXDo0fpHdA8TeIBTxnS6NzQWjZIWcfAWyS3z67DV/FM0lXHNHE3cA5gYSADcEe3ZVQqKZtQKuVo3tGx0ocbj2cB19ys/otBVxzR1YqXMbYtdEDfe08hW9b9LptdQ1b2bnSNMUn9Q/lx1t7oHCKltTBdrsuX6+YJQ1ry+Mi7XjIVxQ1VRVMEgnYWHgWWF1bUKmuqqcafCG+S04NrOv09lo/CrpZGPeyX+C1wDm7T6sZIHTN7BLljdqVi5VRpDu68oT3WGU8QHRtdY+oXzyq6tkbCCQs+ZbPIqHIjXVgawhpG69gBysxVzGrr3Z9MY2j3TVbVhpfK45HCS02F00gNjkpUOE5s1RikjQ6LRbxuLVo44NrAL8JPTY2wQbDgnrZWTHXam41Hbz2ZZttkdhxY5XrSb+rlFAF+EBzgXCyP4i+zxztriSoeYHcCxRHDcc8IQsTwqtko9kbubnlJN9MhHCce62f7JWQeu56qS5LToHIeXHolzIQLlT8xu7JxdIVlSY3EEWv0VUEgdTLYPJNgFhPE+rXcaWE+o2Lj2C0lfqbWRSF52gDlfPKmV1VUyTv+5xut+jwqUtz8Css3FURiNnDqrXyorfYEDTKB00oc4ekLRCljt9q6xkLmo8NuN3UsoeOxwVVVFFPTPtKxzT0uFrhOx7tzxseP54hYflv/C6plqDDd8cVTF+oZH57fmyKhabMlSVlTQyiSnmfG4djg/IWs0vxXBUAQ1zPLk4D2i7T/wAKpnh02YkOjkpJfi7SgR6UN+6CoiktyN1j+xU5SLNPPrDGPtG0ualJ64zx7eAqtzXg7XGxR4m+m3KxvO7pj/TVcHWJwFJosuDDdT29bFUpJkqjwAXUXZFlPagk3JRWVQhWRAOSDgVZVRu5IvGU6ILRGlnfR1cdRGfUw3+R1W7jqXTwMliyHgOCwdlq9CrmuomNF7sAabrnfksdxUjTpn7mhSqpnS18bpb7Q+5PZGnpzV0lI7fskim8wuYMvscAdr9/lF1Ev+uDQ3+E1t2kDqe6p9e8QR6RC6KEB9a1vpYD6Y+xPv7LDp4u9seTe37bZ3iPWf8ALaN1FQyN+rc21mgHyY7XPw4/uFmvD9HpmpstNPsrGkuax4JDgOg91U6S2asqKnzHEyuBfd3JceVeQUYoKmmZTwPke8GMk2B3HJJHSwBXUlGONbE+QIbnyaeKM0kP/Ut2gAbelu9yszrNa/WNRibSNMrYAXXHDiOT+FoNS8MU+r0cVOypmbOxnoIcXB3va+VS0VPVeFoZ4q7ZZjvNieDdruhAPv25WfFFJb7t/QTludB5nRR00M8cbWDzGOkMf6b5VnoeoTRV1U+J7Y4gwyy4Hqc3gj8YXz+v1Kelr5YYQ6ONrj6H5IvyFtKKjfReFy9m81laGYcPsvkNt+5RZMThFNvsGMoybibLQ9aqdVkL5aM09PsG1z5AXOf1wOAo69uZAXYsBys/QeIqWmqqbTal3k1G7Y6NwNw4gW/C0GvyxzUL4XOLBtuXA5Fuqw5U381X0BSUuDCVFT9VP5Ebg5kbvVbutRodONgIA91hfCoErKm8wkImNj1I7/lfSdEjayH1DPRVqobJ+n9DY5N0NxasaQitwbqZIAHYqLbO6pLjT4E3ZMSE4UeFEsIPKkXsYQDyU2MW+wH+ggYTk8dENwDWk3ypmQOsQbD2Sszy0kgcd0xpJAptkZnAAuvnp8pB1QG3LyeFGWqDWuBJvfCrp6zbE4vLdvGeiRvV8BqDOnqnknycDuQqiur2QRkzStHcuVJqXjOOGd0VG0zAcHht1m3ms1apdI+7i43sMNC24NDkm92ThATzRiqj2OavqwrZPLgLvKB5/UVHT9NdOQ94s33TlHozYrPm9Tu3QK0aA21sBdiGOOOO1GOUnJ2zoYWxNDWgABM2KCCi7x7K7Ko2FZpLoiX0pLv6Cc/gpCKsDJi3c6KZvIPpctDPM1tzdZvXK6lZFeo2m3249V/ZeZ/H/ksyahNbkaZ4E+UMuEM7S2WNru7mi39uEnJpIJLoZL/08H9ik/D9VU6tM6KOklYxvEzXXb+QevwriaGqpXETQ3b+oDC9TGSkrRjaadFS+GWF+11wexCJDO5nKsfOEjNrrOb+l43BQNLAQS1pYe7DcfsVmngbdobHJxQH6llsnafdEimY8j1Aj2XjqV+2zCx/scFIy07Wk+bA5h72/wDsJPpuLD3Jls5gc02ScrfLaSkPKm5pqx7SOm66RqKrUG3ZJMHDvZEouyWMVEvqOUqZAeUq6d5J3WXglJ6X+FpjFoW2hsOB6qw0urbTSuDyAxw/uqYTAci3yn9Kmg+uiM5OwG+BdK1GP1Mbi0FiltmmXWr6nJSUXoNqh4sCP5B3WRg0h1Vvke8HcSXEnN+6stRq4tQqpfOdLGzdb0xn7fbsqzVtQqxUCDSGzMp2DaCRbd89/wArHDDKKUYdnQjnir3dAJGafpmvwGrL2Q7QXua3dzxhaCmhirqSaSkkEhuTGWkm4WdqaR2ogS1cbfMa0CzXfcrvTRS6dQQwxMkux7ngl19pcADb9kWbFJwXD3Ikc0d3fAhqkmqUldRgVVSIQSYQ0XDX8Gw6rVyVT3wR0utNgO4ESBovHu/5444VDX65DI6OCaCQMYfS+xOz3BHCUlpxq2osNLVSTuYAxjY32s23xjqUpqTilJbaG7oN3Hk0ApdNZUy1TY2kA7jI/vza/uhVWqXlH04Yxrjcucbk9ieyHRaTJBCPPLXtGfIcLE2/q6lVc9FrrKWuZR6WHQyN2eZK5oeLnpnJthLjDfKr/wBDc1FbqMtrFS+t1OoqC71OebOB7YVhqHjnVK7TRQvZDGPKETpWNPmOAFrkk8nqlI9Lq5Iw/wCncAehwhDRqhzjdthddlQhJJNXRxpTkm2vIfwlXtotVEcthHPZu49D0/4X2LSjc7Sc9Avk1NorGW35K1mk67U6f5cU7TIxh/7g+8Dt7rn6/TPJJZI9j8GVJbWfQHyBoduxZLS1DGssMkLM1Xi+ltzOT2EJKopfGWrTSn6bS7NJ5lJC5UNLnn0v9NLyQXk38eojaQTbahVmq08EYkkeGtaLuceP3XzqTUfE1SCPOipw7ksAuPylJ9O1CvY1lbqMkjG8NOQtuP8AH5OpyFSzR8I2Lf8AEDSWVb4/qmtZ0cGkg/lMy+LtMkjJGowAgY9dwVhYfD1JGLvBef6inI9No2jFPH/tWmWhxtfJilmf0WVV4soGl2yoMrugjaTdZ6vqtV1vdFsMFMTfacE/KtmUsTfsY1t+wUjFbqmYdNhwu1yyp5ZyVFJSaJDDYynee1sKzZG1jdrQAB0AXkjhG5eGoY3N1ssQMACyi5waUt9RJI7ZEwlx6AXKZj0quls6UCBvd5z+3KiTKs8ErQcuARPMj/W7/amYtPpYMvJnd/VgfsP+UffD/wCzF/sCKitxaatVTU1JJJG71N4vlYaaWScSTSyOdJ+onK5cvN6BLazoy6PtGlUFNTaJSOhiDC6EONupsvKlg3A5uuXL0cOkc6XZVOoqed8m6MAt4c3BVQPTIWgm11y5GCHEz43bQbjscps07PI8wXB9jhcuUZRX/TQVJLZIWH3AyqnWNOgo3nyi/wDLrrlyzz7GIoZMFRC5cmIjPQT3Kaomh8m4825C5crl0WuwzP4gG7OUm8nd+Vy5Kj8hngHuN+UVkjrgXwuXJ3gX5JytF17T08chLnNz3C5cq8BLsadNLTyRTslfuiG1oLiQBbsqKs13UYJpWxVBZ/F247dly5YKW5Gtt7TqWtqHt9UhKcb6hlcuXQRgYaP7wnWxttwuXIZhxPXRtxhD2i65clIM8ICE9xbwuXKyEHONuVOnJduuuXKp9EXYwOUhV1Erb2dZcuQ4+wp9CrB5jvUSVoaHR6N1GKh8Ze6/Djj9ly5aTOMNtG3bE1sQ7MaAgSyO7rlyNAEIWiQ+rKX+of2b+y5crIf/2Q==", "modifiers": []}, {"id": 6, "name": "Chicha Criolla", "description": "Bebida tradicional cremosa hecha a base de arroz cocido con canela, servida fría con hielo y generosa leche condensada.", "priceUsd": 2.5, "categoryId": 3, "stock": 35, "isAvailable": true, "imageUri": "data:image/jpeg;base64,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", "modifiers": []}, {"id": 7, "name": "Papelón con Limón", "description": "Bebida típica ultra refrescante y natural preparada con papelón y jugo de limón fresco recién exprimido.", "priceUsd": 1.5, "categoryId": 3, "stock": 77, "isAvailable": true, "imageUri": "data:image/jpeg;base64,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", "modifiers": []}, {"id": 8, "name": "Quesillo Tradicional", "description": "El postre favorito: flan cremoso de leche condensada aromatizado con ron venezolano y bañado en caramelo oscuro.", "priceUsd": 2.8, "categoryId": 4, "stock": 18, "isAvailable": true, "imageUri": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAC0AUADASIAAhEBAxEB/8QAHAAAAQUBAQEAAAAAAAAAAAAABAECAwUGAAcI/8QAQxAAAgEDAgMFBQUGBAUEAwAAAQIDAAQRBSEGEjETQVFhcRQiMoGRI0JSobEHFTNictFEU4LBFjSS4fFjg5PwJENU/8QAGgEAAgMBAQAAAAAAAAAAAAAAAgMAAQQFBv/EAC0RAAICAQQCAQQCAQQDAAAAAAABAgMRBBIhMRNBUSIyQmEUcQUVIzORUqGx/9oADAMBAAIRAxEAPwDz8wQJttWh4f0QzSCferfU/wBndiGEltcSxkHOCeYVYafa/u2AIWBIHWuBqr3s+h5O9TSt3KJJ39jgx4CqSbV8tgnai9ZvAYWAO5rF3Bldzg1h02n8nMjfZZGKwjSm6Ei7NVXdsFYnNAxTPH1anXE6MnWtkadjEOzKLbTNPhvYiXJz5VT6/oiW8vNEflTLbVzZZCSEfOio7qbV5gMFlHfWivfVPd6Mtm2yO0zbRSxAB1xTMjxrV3WiyyxAcmflVYvC9yX3yB6V0oauLRzJaSSfCKYkYpM1qrbhQbc6sasE4ZVR/DH0qS1cEXHRzZhebupQw8a3g4eT/KH/AE1FNwusin7FdvKqWtgyPRTRig1LzVa6poTWS8yZ67iqetULIyWUZp1yg8MfmkpAaeBTMgYZwO1LSYpc4qZJhnVwJpMilFXkrAopRSUoqiYFziuzXYrsVeSYOzSUuMUhNTJNp2TSEnFLSVMkwJRFrYXN6fsU938R6U7S7P27UIrfuY716THo8WmWAmZAqAY6UE5YLjHLMfacJFxmd2YnuGwq1g4UtE35Dn1NGvq0KMRGM+tRHXcd4FZpXGhU5CIdCt06JR0WjwL3VTNrv89N/fx/GfrSZajA1ac0iaZAO6iI9Mg8BWT/AH+R98/WpY+If5/zpb1WAv4rZr00qAke6KJj0iAkZFY5OJOXHvfnUy8VlSMPQ/y0EtHJlRLqN2pPJcyAf1GhX1G/b/EvVvqmitDzNHnHgaomYRkhtsVza3lHYcFnkile6m+KYn1qLsJsH3vyoj2mJe8VHJfQjvp6cvSFuMfbA5YXH3jQkyMBuxqebUFJ2qvmuu0O3StdcZPsy2SiuhYoWnmWOPLMxxivSeGdBjtrZS+7Ebk+NYLSrhLeXtHFamHi9IgFXIx5UvUbpLai6XFcs2vsEB7hXewQfhFZaDiztD96jYuIObqxrF45I1eSLLwWsa9AK4woKp21+NOpoC54qjUEBt6myRe+KNE6QpkkigLrU7aBeorIXnE88jHss48TVNNfXM5PaSE+VPhQ/YqVy9F1rmqwTc4Xc7jasmw3NFE5zULLvXQpW3g5173MiAp1O5a7FaciMCV1ScmaTl8qrIW0YFp3LThXVW5g7BvLThXV2cVe8mw6uNJnyprE1W5k2HE4ruam70vLV7mU4i81ITvXBDXYqbmVtLThmYxcQW57icV77a6fb6lpQRwCCu9fPGluYtVtn8HFfQXDVyWshv8AdFTOWA+DI67+zi5JZ7CTBO/KelYXUeF+I7Fj2lo7L4pvX0D7VjqBUbz27j34h9KB1phxtkj5rMVzHtMHQ+DAinojEfEfrXv93p2lXe0sEZ9VqivOCdDn3SFFJ/DtSJVv0a4ahe0eRBCBux+tPUYA3r0eb9ndgc9nNIpPTDZqvm/Z2B8N2/zApDrkPjqIMxQx405Sua1J4AlH+LP/AE0g4Clz/wA2f+kUPjY5XQ+TZXOm9upVqz95wesxJFaKXX7CMnmmUfOgp+LNMiB+3TPrXOUJLod5M9mVm4DkOeVj6UG/AE5+8a0c/HWnLnlbmPkKq7jj6PfsoXJrTF3egH432U78BSJks4FQtwjHEfelHyqe74yu58hUVQfHeqifW72cnmlCjy2rRHzPtipeL0g46JbQjBb86ie1tY+nUedV5uZn3ZyfnXKxPU5q8S9sH6fSDRIsfw0jXL/dzUCtS5qYII8srH3mPpmoW36inud6iY0SQLGsaZzUSumalNGssVjcvG4yrrEeUjxBqeLh/UH+NY4s/jkH6Cicox7ZFCUukAZ6Uw9avk4eto2xc6mvmIYz+pog6Fo/Yq0FxPM5O6HqPyqLU1xLektl+jMUqKXOFBb0Ga1EVnptuzEW0bcux7QZxRJlCx5g5VHcFWhlrV+MQo/49/lIzUOm3k4+ztnx4kYopOHb6TPMYowPxPVkb24zgtjxGKX2xZOZeybyJbpSZam59YNUdFUu22Apww5P2l3GFHXHWnSaBaIu125bwwKmDzZOxwPEU1XeOQMwBoPLa/yHLTUr8Qb9yRP8M7/SnrwyWzm65R/TvRryyvvGQo78CmpcFfikbmqvNb6Zf8Sj4A5OGnH8O4BP8wxQkmhXkbYCK/8ASav/AGlniJEnzK1PBeqEXmgPMPvA1S1V0V8lPRUS64MfNY3MBzJA6jxIqEAZ61vkuIp15m5QO8Fhn6UHPZ6bdzFeWPnPcBg06vX/APnEy2f43P2SMcVpOWtLPw5bjHZyNGfqKr5tDuEP2bCQfSttespn7wYbNBqIctZ/orEPZyI4+6wNe28F3nbWab7Fa8XmtpoTiSNlPpXof7PNTDRLGTgrsRWluLWYswTUovEkelyNQ8j09nyM0NK1LBIpHxmg5pzvg4qSaQb0DLJvQhjJLlh94/WhZb2YZxKaSVutCStmhwGhZNSuR0lNQ/vS5B/imoJDvtQzN72KmAjHklupPzphWlpCayo6Ah2NMJxSk5NIRRIBjS1NAya4ilXajKJEWn4FRc+KeDmgeQ0yQNS7mmCnZxQ4LGv1qF25VYnuFSu3nQsz5DBdyRgetMisi5NI9u0rTux0DTufDt7HH7w6H3RUh04SQkOoP8pAxV3DZiz0yytuXl7C3jTHhhQKjZBvmvNSg3ZLn2zRVe3FGYn03TIR/wDm2YMJ2LRLgr9KiThrRLo50zVpo3bcCVQVT1PWtHcW0VxEUI2Iwa841iC50q9kCMycpyQP1rbp5OP0S5NUc29SaZc3/BGtRuZrJLTUojuSh5CfLFUFzDrOnlln0p7cfzIcfU7VKnF+sdkttb3ckcON8bE1e6Vq+qyQBZJ3mTHR2LA+uetarZVQXKLjC9L6mmZVVmuZCbhwP9Sj8+lHTQackS4nHMp+0Kuh28t96sr/AEBL8F440ilY5IX3V+ndVDc8M6pboXSATqOpikDH6dfypVc4W/axz4XZG+oJCxSFeZOnOdub1GSKGnu45cYyPIDrQ2SZuzkiZWBwRjBHjU8sUPxCHkI2AXPStHjimBuZPaXScmOVgM7q3fTrqS0Vz7PG7AjO5BKn1oeKadV9yEFccvMV6fOjIkPYK86owPwhCMj1oJRw8jIvKGR3UElsF55e0B3QrtT0lZlZVwAOoJxTZJmGCo9w94xmm20KzOHaR0AO4IxQtLGRq44ZNDHGsmWlPMBnlKgiugRu3MojDrnBo2du2g5LMF2zuFT/AOmhrE3CQyK112AfZ4kyOb1paeVll++DpJcn33ZGB2Wi44r8JG13DJBA5wsjRnBoUQmNgwXtgfu8nMaI9mvLqFSDKiMcImDv44GaHCwE288Ed3DGkjiNhLGPv4xn5UJZzXOm3IntSobvBGQaKD20EWJLkZHUNQVzqthEGQMr+YGx/wB6ZU7E/pAuhXOOJ4PQdC4vttW5LWdDbXmD9mTlXx+E/wC1W0sorxmx1SMa5YyRgqqTqck16edRWRcgjeuxU5NfUeX1dUa54h0ETyZJoCaTc02W769KBlufOiM6JJZaCklpsk9CyT1BiJJJaHL5bzpjTZqJpPe6VRDNNUTSHwqUkVExFZ0bWxoel59qaWHjSFwKPGSh2abzVGZQO+k7UDvolEpyJQeZhUw2oP2gDp1pjXZ8amxspzQeZAB1qJ7kKKBEk0xxGrN5AZoqDRtSut1tnAPe2wq9iX3MDyN9EMl3npRGi6Zda9rdnplqD2tzKFBH3R1LegGT8qNh4QvXAMsscee7Ga13APCgs+MtOufbA7RM7lF2yOQj6b1PJXHpgThY4ttHrl7/ABOucd/jQL9aKu95DjpQpFeYhLe2/wBmqlYiiMCsfx5agG3uQDlgUPy6frWzxWb42j59MiPhIf0rSuMM26d4tRgLG255lUD3ia9A0qyCRpygAY7qy2jW2bnm/DW6sUwi7d1DN+SzD9GnVyceETCAqu6Z9Kim0+OTPcxGD3VZJ0FPPL95QSOlDKv2jCrWjGanwvYzS9rPFI8r/fSQrv4nuqkuuEXjj7Wzvi8gP8JkKnHk24Jr0l7aOTIZcg9Qahl0+N1wqBfSrjZdBccjo3r2eQTwzW8oFxBKnm64zXIWdsKJAD9K9QuNKj3VlEiHqHGaotT0SO3tZGtY2R8EjfY0X8vL2yXJqhOMnwZqw0q4uJ2RnUD7xkwF+tTHTlhlOZxyb568orOXWtXsUhQPyldtqAm1O6nXEkzEeGa3rT2S5ySV8IPDNlDf6ZauRO4bl+Eqds+dCzcRWEBPLAJD0zzfmax/PIx7zSBWY4wSa0LTL8mJlq1+KL6fiWVm+zJCjpgYzVdPrF1MT9owB8NqSHSLqUByvKrdCd80emiW8Cc11Mo6ZDsBTFVXHpGeWpnL2U7TyyndmY+ualg066ud1QhfE1cdro9nuxErfhjXO3hk1HccTgSILazUImcB2zn1xTF+hDnJ9k1nw4+BzkpId1I7sePhRKa41vO0JbIQ8ue6qubWtW1NRD2hSNznkiHKD/f51qND4St9X4dtrxg3O2VYjxBxUUtr5EWVSmiFdYWRc81NbUA33s0Y3ANwDmCduXuGKBm4Q1mIEqhYZ7qvywEfx7ENa8z31E1znvoO5sNTtTiW3cY78UGbllOG2PnV7k+mC4tdlqZvOonnAIyarGum8aT2hmNR5LRWm7qNrrNILRm7qcLIij2ILfIiNwaaZmNFwabPcvywQs58R0Hqa0FjwPO0IuL5xGn4B1NDKyEOy1GcjJqZJGwoLN4Cj7bQtQutxFyL4ucVtLHRRGOWztVjT8b9TVxBoi45riYufAbVllq2+IIeqIr75GFh4UVMG5uwPJRmj4dG06HHJA0xz1betxHYWqfDCufEip0hiX4Y1HoKzystn2xidUOomQht5gAttYhB/TR6aVqTRZMoj/lrTx27tsqfQVNFp8szYA+tUq2y3qPhGQtNIuWnPtDNyDuz1recGaRY2PtV8nvTkBMH7i9fzP6UyLRxzlZDhvCrrRbJ7Tt4yo5XAOfTuqTpcYNrszXXSlHB0hyzHxNQmppV5SRUIXmJPdXE0qljk0Q6FAzVDxigOmxD/wBT/ar/ADvVDxdvYQjxkP6VsnxE0af/AJYme0aLJdu7pWusfgFZzRE+wf8Aq/2rTWQGBnakUvNkjXrfuDFGBT8Ug3GRTq1nNOxXU9U2zSBamAcjOXm7qhmtI3RiRvg70WFxTJf4TelBKKaIpNPg8I4gsObWrgR45S5wBQsGmQxzAXEyqo65OKseJ2nXVp8/iPwjFZ9kld/gJJ8a61LcoLLNd8Huyi0E+mx3MoaTMQJ5Qi5zQhvYIySkA6ggE1Gmm3EkfO2FXON6KOkJb3BhlfnKgHI2G4zTW4L2Z1FkVxrt7cLyIREpPSMYoeG2urpyERjsSSfD1rQJY28DSJHCOZbMsWO5JIzn8xRmm27NZu4XI7F8HzP/AIoPL8IJV/JQpoMwtpLiduVFjV1H4skCirbRbdUglYswkcrjOMCry8Rn0Zjjb2OMfMNk1DaQvLpcLKCeSUZPgO+glZJhYSJYtJgScssBVI15UVT/ACnJPzNehfstRRweiTIBieQrnvBPX9axtxqWmaaMz3UYfryI2W+grTfs+1ebVNKvJkjKRLNyRDwAXenQWJGS95gbs2Nu78wA+VONlARgoKDtGeNcucmo7nXYrZ1TBdicYWn4iu0c/dP0yabQ7SZSDGp9RVHqnAGmXsZxboG8QMVqIp+0jDFSuRnepVdWGxFW64NFq6xHjGs/sykhc+ySMO/BrGaloeraST2tszKD8Sivpl4klXDKCKrb7Q7e7Qjs1znO4pfjnH7eTRG2ufElg+dWhC1YWGh9tD7beN2FoOn4pPTy86M0zTI5la+vcizibHKOsrfhHl41bW6PqMzXN5BywAYiiI2A9KRddh7Yj6qs/VLoEsraSbkFvD2Nqu647/Wr3PuBTuB41HzDAVBhRsAO6iILZ5SMY386zxg2XOzI1N9h0oqOB2xsQPGrGz0kKyCc8gPQ4q7gsFhnWGTlaJuhxsadGoQ5FLFpDDlZzlG8KsLbSUimAZQwbpVxawGMSRlAAu648KeD2ZDsAR0A76aoJAOYLbaUIHBOMHoKnNmqtlVAA61PLIq7kjPdQV5rFrZx5nmRSfE71UpRj2VFTn0gt0hXBwMnvqSIDmz5VjL/AI+tIdoVaUjvIwKteGeIP3zpcl26cpEhQAHw/wDNZ7NTDY8Dp6a2EN0kF3LfaEedQZz06Us0ys1NRhXDp4RpjFpD+U1QcWnFvbr/ADN+laEMBjzrL8YzjNumegLfX/xWif2mnS5d0QTR9rb1NaK08KzOkyqbdcH71aazPuDzpGnjicmaNa/qLAdB4U4YyKZkKuWOAOtPikjlB7J1YDqQc4rZlHNY9aWuHhXAbVAGJXOv2belRW1vJDPKzycyOQVXwoh8dmwJ2xQp5WcEzhnkHFEKrqkxx941QBTz57q0fE0ofUpAsZHvHc99UhABp1EnsR3Jx+lE7Qg6WrY97tD9MVFqULe383QNFGcf6RUySu9g8SozBWDkgdBUExF1cB5GfAVV2PQAYrQpGNx5LFuzF2VkZQHs+Q77D3RjJqGy1i2hsGsoopp53U4CLsD/AGrtWjSKWKSNkZGQAcoAAxS6TMe1MQSFmIyOdc5+Xf8AOiT55AayshErzvYMrKEZICOzU5wMjB9aro4mu7eW25m5SObAPfVh7cPaJTJ8QiIwe8iqmCdYg55yCRtQrJBbDR9PnuQZTJyjcrn4v969V4NkjTTmgt4BDEuCqjzrzHTbtTMxOFYKxzW14U163iglRy+MKeYLt30U7JRg5fBmthu4N6/vRnLbeVDRRxI/OqDI7yN6htLxbsAwyCRT4UTsds1oovV0cpGCyt1vAskjNkdsVB7qSyQwczBpJCxyeY0kiYZQB1HWkV2jOCwI8hWgVgsLe/kLESqkYHTLZo2G4imHuMG9KzrqJJQx39elSwXDoeRGjjGfiAq1NorYYDXLRLa6sNNtkHZRkYXx3zUkpPPyitJxRw+uo2qX1hu6e8AvUHrWZtpfassylJUOJUPcf7Vz41uMmpHUsmpwUo+gm0s2lOSrFfEDNaKx09WhwgSTy+Fx8qEtUVUUrBcKMfHCevqKs7WRJ1QyyB5gSFRQQ2B41qjHCMTeQm3RJbdoxLzxr94H3lPgaJt8LFsRPH3cvVTQ0Uh7Yyq3Iy/GjpyY+f8AepY2VJcYTsZScjlKH132NEC0GiRxcI23Iy4A7/WhmuQhc5zg55jsAKhMhXEK5AXdh3iqTiu6kh01Y0yBI+CR5d1Ivt8cWx2np8k1H5Atc4rkd3gtQAoOO0zufSslc3EtwxZmJJ7ycmo5CSTg0wDfvrjuUpvdJnqqqIUrbFEL27SZ5tzWs0ma70zT44rSUdmN+UjIJPWs6oxWi0xlkteXoR3VnvtlGPAF0VJYY+XX7xWJkgX/AEdKKs9dSfIJwR1GKEngywVV5mPQAZJo7RNBh1bT1uLe9iBfwGSviCM560zTOViykc26MILLeAw63BG+/v4GwB/3qk45NoulQ3kNyJJ8jnwdsY6YqxvOENUgHNEYZh4KxB/OsfrMZ9naGUEEN8v7GtcFKOfJECvY5KVcuiq0fXuxvBG7ZRjtXpWnXIeIHmBJxgedeRyWMfNV5p3Fl3p7xJdsbiBNsgDnA9e+nuqDeYg6hzk8s9YUQyxhZPeTHvetOtreG0jdbcEiR+Y53rM6TryaiFaOTlVgGHN0wfOtJBcLgAHIboayyraecGXPoK5cUoG1cGjY4A+dSBo0z73yqANjahunEcDMzBQB1JqfAO+dqD1hIV0x3lbmXHQHG9BN4i2FDDml8nlXEU4k1CRo2UrnrVNgsSS+3lROrXSPeSBGXYnoarGMp2VSR61ppg1BI7lstrwHwXLQHliI97bBGc0NIJoWPMjY7/CoUymOpfuVBk5pTdyRswcsG7w1PUDG5ckr3KtachzzBthUUU84lDQKSVPU91K11EYGYIA5O4NDvqLquAaYogOResq6nGWYLHcKvRDs/nVKGjiyXyT3UL7ZK0gOd6bc80ajn2z0PjRqsW5YDILiNZSVByVIq90S/WG5A6KV5TWORypyMnzFTQ6i8GSuckYznYZpiraYmUz06C+KN21rOI2P3kfGf71faXxMs8i2t4FWYjZwdm/714a9zMxy0xY4x1qW1vbm1mjmjlkHKwbYnFX4tvMeBb+pcn0Eb0KAObbu3pntqHmHMD3gnrWCsOKWurde2AWTGTg9aK/fQI6/nRp5Mso4ZsorrmfA2x15jSrcpIVLE9dwoyaySa1zjkViM7nm7qnj1NeZQOQ+b7D9apkSLfhHib2qzWOQATr8SdzDPUUZqfDtpqzNe6XILW+XqO5vIjzrzVLiaxuElt2KsnvEnw8K12m8QLdcpMhtrkAHOcdaucUFHK5QTaNJb3HsOpRTWtwfgCnAkP8AKTsfQ1YW84C+zSRFI1JY5lHMfoRUq6ulzD7Lq1rHNEfvgZpTpUM6A6deJOuNorg5wPJuo+eai6LaX9DI5Et0YJCHMgyVDF+YfzZH96KjiwQZkAlJBVU5/hxkZBPX0FAyK1mmLmB7YIfd5YhyH/Uu31AomObGJo1VzjmJU9PXlJFVgnJPISt0JgMKTk7flT7y1tb9JLW6XMbgFW6FfMedMJhkPaAopY47Px9KcVSVeUElh0C7cvnWe+tzjwFCWH8GF1nhjUNLZpOQzWxORKgzt/MO6qPoMivVheT2wPNGbiLHVd/yqvutE4f1vLBfZpz1aI438x0rlYjnD4f7OxVr5Jf7iz+0echiTVzpM+H5D60fecB30QMlnLFcx9QM8jY9DtVamm6hp0weeyuEUHGShx+VKuqlt6Ni1FVn2yLq3vJbO6S5iOCuxB+8PCjZF0fUH9oWGS3uDuZLZ+Vs+PL0P51TmVGGxrlI8aTptXKlbWuBFunjY93TBtbk1JYWjtuIUlQDeKdDEzd+5wQaw93d6lKwWXLCMcqhSOUDyr0Vix26jwIzVXqGmxLbGZFAw2CMVuWtUnjaXVTtMIZLpuqPUbxXTg+4a2MFpHJ1j+lHppkB6Lv6Vb10YPoKenb9lNwXdxWTezXrGBXlZpJGjLh1KgAbbjBB332PlXocULdmZtLuI7mLHwqwJ/7Vml0qLOygGnLp8kMgeB2Rx0ZWwR86ta6Fn3Iwz0bzlM0I1d7RglzC8bE9GFWdrqUEgBVslvGs3BrGpQ5W45btT17Vd/qN6nN1pUsUk/YTWtwBlVQkhj4Z/wC1GoVyWYsRKua4kjVSHt4HRWCswxmqjioY0BoFOfcCknv2qKyTUpIFmgkglJGTGkmeXy9apuKNUuI9OlS5t3Qhcliuw+dJnRL7kuy6IpWrno82mWOBz0Jz41A9yADvQs1yZJDjNCySPmupCr5Nltiy2WMepNCxKHrUd5qRuGVioBAxnxqtLN4VxycbU5VpGOU23kmMxO+dqY0u/SmqrUvZGjwkDmTOST3snOPKlkleUAEkgdM09Ld3+FGb0FFQ6TdSH+Fy9/vbULnFdk2Z7K7elCnuq8i0EAc086geAoyKwtwSLe2aU9zY2Hzpb1EelyVsijPxWE8hzyYHTJ7qOitEgHQySDuq+TS552BlcAY+FdvzouHR1TGF/wB81acpd8C5Siuimt0dBk9T3DpRSLM+MtgeRq/j0nIB5Dj0JzRcWilCcqflTVwhDeeShihlfAJJqyhtpycBV269aIuXsNPP286KT91Dlh8qrLjXJmK+wQFFXpLKcn1xQOxdBqtv9A9nbGNTNcHt3J7SZlzhmPwqo8BQeptPDJF2TFZz77EfkPQCraGF0b3ScetPl0tLs8+SsgHX9KXHUJ8SLdT9EWn8UTWwC3LYAwfeGVPd8qu4dYt5vfSYwOR1DbGsTqtnNBOUnhZUX3iy9G8AP/vjVf7Tc2bfYuVOMkDcHPiKdtT5QHKPXLfiTUrUEsVuIsbCiE4i0eZua4tHtZCf4kI5Wz8q8ptOJpYSFl5kI/DuPpVvBxHBcjlZo5D9D+dC1JEyel219YyM3suqRuX2KXIw3yIoxRIEXmDci/ehYMK8wM9rLgboe6pY57qE5tb+RT5PQ5Ze1M9La7hiCPIzEZxgAgj12p7QWF8eT3efqGXYivNzr+uxnBuFmTwcZpV4p1NHy1sufFDilTipcSWQ4xa6Z6KNLmiYG1v25fwyDOfmKaz67EDywRzp/wCm4/3rBRcc30JwySBRvjGd6Pg/aRMuzInzQikPTw/HK/oP6/eH/ZbXk7Nk3ejyKc/G0OfzFAGbSzkFezPhzEGiIf2kWvKFki9d+tFJxlw/eHF1bIwP4kDVlnoVJ8SNEdRKPG3/AKZWBLNziO4YfPNMurQSWzQrcL7zA5buq09s4Luj70EKZ8AV/SnDTeDZmPZXQQnpiZhSf9PnF5jNDlrEu0zOxaa0ROJ4yAe+iwsiDdkIq7XhrQJf4eoyjPeLiuXhHSnc8up3QI6fbLv+VBLQWy9oY9fH9/8ARVRsuMty58qekkfMQCM+FWX/AAXZufd1S7XyDKcflTRwHZB+0Gr3xZh1ypH6VF/jrl7RX82r3/8ACvJjPhvTWSE9w+VWo4JgbIGqXWfVf7Uo4FiI31W6+RX+1MWj1C9op6ykpeVEbmUkHxBxQetQS6tai3muJCq9FL7Vql4Hsyfe1K76fjX+1KeCdOVd765bzMg/tTFRqsY3C1qqE8pf+jyyTgpuY4miA/qqBuCZevtMIHzNer/8I6Pnea5f+qakPDHDiA8xyw+69yf71ojDVL8kDLVwfo8oHB0ak9reqAPAY/WmNw/psRPNeE4HiK9ZXR+FYSe0FmCPxsGprTcL2+CtxaLjoEA/tTlC5/dMS9RnpHlK6RYDeGOWcjwUmjYNFcgdjo8pPiyAfrXoX/EfDsUmAxkA/DGcGhDxZpSBwtnPK3cQAB9KPxZ7kwXbL4Muugau7BRawwKOmWz+lEDhO7b47lSM9IxgfWrRuLAM9jpxz/MwFCTcS6nKcRRQQL4AZq41QXoBym/aFi4URME2/OcfE2TR0fD4AAYLsNgcAVTyavrDj3tSkUeCACg5ZppTma8ncnxc0xcdIFrPbNI+n2MDA3E0S472Ix+lRz6tolsVHtSyeIiXmzWXZIPvKWP8xzQ8oQ/f5V8BtV5kTbH2X8/FS+97HasPwtK+APkOtU99rd3ek9veED/LhGPzoBhbJuSWx50JLrFnbn3Sny94/lU2ZJvUeggyTY+ygCk/ebrUUsnIOa4nJ/lB2qnutfkl2iXA8W/sKrZbiWc5lct5dwpsahUrMs9RsplZgOu9aG2tUkAYL9K8xstYeJslu+t3oHEsUihZGUYrl21tGyuSybA8N2Go6eYbiEFSNs9RXjfEWlNomsXVvOcxxNzA+KnoK9lttftwP4oIx41iP2g26apPBqVsgd4FOVA+I91M0tm14AnGTy2ecSqETlb+K3vSAdx7h8v1oR0VW26IMnPjR8kXKzs55yN2PiaDlUjER655nNdNMytHR313bY7KdxnuJyPzo6DiS5jwJYkcDqRsarGUksxGx6A/lTSNgvzNW0istGkh4ngYDtFlQ/UUdFrlnJjluU+ZxWM5Sd/CmkHNA60y9zRv1u45PgZGHkQaUuCMlRXn+67qSPSpUvbuP4LmQY/mNU6n6L8huGSF/iUGmNBAfu1kU1u/TrPzeoqePiK6B95VIqvGwlYjSG2jz7rMvoacLYhcLOw+dUKcSN95BUqcSIcZiHqGofG/gLyL5LkQTqfduWp6reLut2wPqaqRxBCeqN8t6kGvW/eHHyoXX+g/J+y2WXUhuL5/+s1IlzqoOPbpceUhqn/ftqfvMPlTxrlp/nYqbP0VvfyWz3er7ct9L/8AIaet7quMG/mH/uGqca3aH/ECnDWbP/8AoFTYTeW/teo999P/APIaRri8bZryY/8AuGqg6za5/wCYFIdatf8APH51FD9Fb/2WuJz/AImQ/wCs1GYWzlpCfUmqttcthtzk+YFRtr9uOnMaLb+ib/2Xixxj4iDTswr8OBWbfiGLqFY1A/ES90R+tWov4Acv2asTqK43ijvFY1+I5ce6i1BJxBdtsvKvyotkgd0Tam9HjUb34HfvWGfVr5//ANxA8hinRQ6heAPzSFPxsdqvxv2TyL0jWy6tCmeaVBjxagZuIrdOkgb+kVn/AGIOxRZA0i9TnINQuqQ5XBL957hVqtfJTmy4l4lB+CJm/qOKCl126kyF5EHkM/rST6S0dnHchm5XHQr30CyFSVbIPgaNRj6F7pDpbqec/aysx8zUdcF3p3LRrgj5GilxUsNuZGxg06cKGAQAYGNu+qzyTBbXEMaZ5Vx1oeKeSJvccjeurqx+jXLsuba/uezx2pptxrF7bSRGOX4mGQRkGurqzr7g/Rcapp1rLbJdmPlkYcx5dgT6VkXiUxsxyS0m5NdXVqr6EyGtGvbKMbYqHlHZA97HeurqYikKqjkO1RFRmurqItjHUb1Ga6uo0JkIe+mnrXV1WAJSV1dUKYtKWZejEfOurqsjF7ST8bfWu7V/xGurqotHdtJ+KlEz+NdXVCMT2iTxH0pO3k/FXV1WUJ20n4zSlm/EfrXV1QiGmkrq6rIJXV1dVAj0Jqb2ieNAqSuqnqAdq6uqmGgsWyLb28ilg0mebB61O8atblGGcEYJ611dQMP0aLTrSONYmHMduhORVbxdDGqQyqgDnqQK6uqo9kZmxRdlBHNMFcbeVdXUUyIMupTZqVgVVGPCq9Pfdeb7zb/WurqXAYz/2Q==", "modifiers": []}, {"id": 9, "name": "Tres Leches", "description": "Delicioso bizcocho bañado en tres tipos de leche (evaporada, condensada y crema), decorado con merengue y canela molida.", "priceUsd": 3.2, "categoryId": 4, "stock": 14, "isAvailable": true, "imageUri": "data:image/jpeg;base64,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", "modifiers": []}];
        let categories = [{"id": 1, "name": "Platos Fuertes", "iconName": "restaurant", "station": "kitchen"}, {"id": 2, "name": "Entradas", "iconName": "fastfood", "station": "kitchen"}, {"id": 3, "name": "Bebidas", "iconName": "wine_bar", "station": "bar"}, {"id": 4, "name": "Postres", "iconName": "cake", "station": "kitchen"}];
        let tableStates = {"7": {"status": "FREE", "pax": 0, "capacity": 4, "notes": ""}};
        let exchangeRate = 791.3248;
        let totalTablesConfig = 10;
        let currentTab = 'pedidos';
        let orderFilter = 'PENDING';
        let tableFilter = 'ALL';
        let activePaymentOrderId = null;
        let knownPreparingOrderIds = new Set();

        function playKitchenAlert() {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                
                // Sound 1
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.4);

                // Sound 2 (double beep effect)
                setTimeout(() => {
                    try {
                        const osc2 = audioCtx.createOscillator();
                        const gain2 = audioCtx.createGain();
                        osc2.type = 'sine';
                        osc2.frequency.setValueAtTime(1000, audioCtx.currentTime); // C6
                        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
                        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                        osc2.connect(gain2);
                        gain2.connect(audioCtx.destination);
                        osc2.start();
                        osc2.stop(audioCtx.currentTime + 0.4);
                    } catch (err) {}
                }, 180);

                // Visual effect: flash body background
                const flash = document.createElement('div');
                flash.className = "fixed inset-0 bg-purple-600/20 backdrop-blur-sm z-[9999] pointer-events-none transition-all duration-300 animate-pulse";
                document.body.appendChild(flash);
                
                setTimeout(() => {
                    flash.classList.add('opacity-0');
                    setTimeout(() => flash.remove(), 300);
                }, 2000);

            } catch (e) {
                console.warn("Audio alert blocked or unsupported:", e);
            }
        }

        // --- SISTEMA DE PIN DE SEGURIDAD PARA ADMIN ---
        let currentPinInput = "";
        
        function updatePinDots() {
            for (let i = 1; i <= 4; i++) {
                const dot = document.getElementById(`dot-${i}`);
                if (dot) {
                    if (currentPinInput.length >= i) {
                        dot.className = "w-4.5 h-4.5 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 shadow-lg shadow-purple-500/50 scale-125 transition-all duration-150";
                    } else {
                        dot.className = "w-4.5 h-4.5 rounded-full border-2 border-white/20 bg-white/5 transition-all duration-150";
                    }
                }
            }
            const directInput = document.getElementById('pin-direct-input');
            if (directInput && directInput.value !== currentPinInput) {
                directInput.value = currentPinInput;
            }
        }
        
        function handleDirectPinInput(val) {
            currentPinInput = val;
            updatePinDots();
            if (currentPinInput.length >= 4) {
                setTimeout(submitPin, 200);
            }
        }
        
        function pressPin(num) {
            if (currentPinInput.length < 8) {
                currentPinInput += num;
                updatePinDots();
                if (currentPinInput.length === 4) {
                    setTimeout(submitPin, 150);
                }
            }
        }
        
        function clearPin() {
            currentPinInput = "";
            updatePinDots();
        }
        
        function deleteLast() {
            if (currentPinInput.length > 0) {
                currentPinInput = currentPinInput.slice(0, -1);
                updatePinDots();
            }
        }
        
        function submitPin() {
            const directInput = document.getElementById('pin-direct-input');
            if (directInput && directInput.value) {
                currentPinInput = directInput.value;
            }
            
            if (!currentPinInput) {
                return;
            }

            fetch('/api/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: currentPinInput })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    const tokenToStore = data.token || serverSessionToken;
                    sessionStorage.setItem('admin_verified', tokenToStore);
                    document.getElementById('pin-overlay').classList.add('hidden');
                    document.getElementById('admin-main-content').classList.remove('hidden');
                } else {
                    const overlay = document.getElementById('pin-overlay');
                    overlay.classList.add('animate-shake');
                    
                    for (let i = 1; i <= 4; i++) {
                        const dot = document.getElementById(`dot-${i}`);
                        if (dot) {
                            dot.classList.add('bg-rose-500', 'border-rose-500');
                        }
                    }
                    
                    setTimeout(() => {
                        overlay.classList.remove('animate-shake');
                        for (let i = 1; i <= 4; i++) {
                            const dot = document.getElementById(`dot-${i}`);
                            if (dot) {
                                dot.classList.remove('bg-rose-500', 'border-rose-500');
                            }
                        }
                        currentPinInput = "";
                        updatePinDots();
                    }, 500);
                }
            })
            .catch(err => {
                console.error("Error al verificar PIN:", err);
                alert("Error al comunicarse con el servidor.");
                currentPinInput = "";
                updatePinDots();
            });
        }
        
        function lockAdmin() {
            sessionStorage.removeItem('admin_verified');
            window.location.reload();
        }
        
        function logoutWithBackup(btn) {
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="material-icons text-sm animate-spin">sync</span> <span class="hidden sm:inline">Respaldando...</span>`;
            
            fetch('/api/admin/run-backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    let msg = "💾 ¡COPIA DE SEGURIDAD REALIZADA EXITOSAMENTE!\n\n";
                    if (data.destinations && data.destinations.length > 0) {
                        msg += "Se guardó la base de datos en las siguientes rutas:\n";
                        data.destinations.forEach(dest => {
                            msg += `• ${dest}\n`;
                        });
                    } else {
                        msg += "No se detectaron unidades. Por favor asegúrate de conectar el pendrive correctamente.\n";
                    }
                    msg += "\nSe cerrará la sesión de administración.";
                    alert(msg);
                } else {
                    alert("⚠️ No se pudo realizar la copia de seguridad:\n" + data.message + "\n\nSe cerrará la sesión de todos modos.");
                }
                lockAdmin();
            })
            .catch(err => {
                console.error("Error al respaldar:", err);
                alert("Error de red o del servidor al realizar el respaldo.\nLa sesión se cerrará.");
                lockAdmin();
            });
        }
        
        function updatePin() {
            const newPin = document.getElementById('input-pin').value.trim();
            if (!newPin) {
                alert("El PIN no puede estar vacío.");
                return;
            }
            if (newPin.length < 4) {
                alert("El PIN debe tener al menos 4 dígitos.");
                return;
            }
            fetch('/api/admin/update-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: newPin })
            })
            .then(res => {
                if (res.ok) {
                    alert("PIN de administrador actualizado correctamente.");
                } else {
                    alert("No se pudo actualizar el PIN.");
                }
            });
        }

        // Escuchar teclado físico para ingresar PIN
        document.addEventListener('keydown', (e) => {
            const overlay = document.getElementById('pin-overlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                if (e.key >= '0' && e.key <= '9') {
                    pressPin(e.key);
                } else if (e.key === 'Backspace') {
                    deleteLast();
                } else if (e.key === 'Escape' || e.key === 'Delete') {
                    clearPin();
                }
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            // Verificar si el administrador ya está autenticado en esta sesión con un token
            if (sessionStorage.getItem('admin_verified')) {
                document.getElementById('pin-overlay').classList.add('hidden');
                document.getElementById('admin-main-content').classList.remove('hidden');
            } else {
                document.getElementById('pin-overlay').classList.remove('hidden');
                document.getElementById('admin-main-content').classList.add('hidden');
            }

            renderOrders();
            renderTableStatus();
            renderPaymentReferences();
            renderProducts();
            renderCategories();
            updateCategoryDropdowns();
            
            // Inicializar base URL del generador de QR con el origen actual o IP local
            const serverIp = "{get_ip_address()}";
            const serverPort = window.location.port || "8000";
            document.getElementById('qr-base-url').value = `http://${serverIp}:${serverPort}`;
            generateQRCards();

            // Polling: Buscar nuevos pedidos cada 3 segundos en segundo plano
            setInterval(fetchUpdates, 3000);
        });

        // --- GESTIÓN DE CATEGORÍAS (AÑADIDO) ---
        function renderCategories() {
            const listContainer = document.getElementById('admin-categories-list');
            if (!listContainer) return;
            
            if (categories.length === 0) {
                listContainer.innerHTML = `
                    <div class="col-span-full text-center py-6 text-slate-400">
                        <span class="material-icons text-4xl block mb-2">category</span>
                        No hay categorías creadas.
                    </div>
                `;
                return;
            }
            
            listContainer.innerHTML = categories.map(c => {
                return `
                    <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold shrink-0">
                                <span class="material-icons text-lg">${c.iconName || 'restaurant'}</span>
                            </div>
                            <div class="min-w-0">
                                <h4 class="font-bold text-sm text-slate-800 truncate">${c.name}</h4>
                                <p class="text-[10px] text-slate-400">ID: ${c.id}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <button onclick="openEditCategoryModal(${c.id})" class="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 transition" title="Editar">
                                <span class="material-icons text-sm block">edit</span>
                            </button>
                            <button onclick="deleteCategory(${c.id})" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition" title="Eliminar">
                                <span class="material-icons text-sm block">delete</span>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        function updateCategoryDropdowns() {
            const catSelect = document.getElementById('form-product-category');
            if (catSelect) {
                const prevVal = catSelect.value;
                catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                if (prevVal) catSelect.value = prevVal;
            }
        }
        
        function openAddCategoryModal() {
            document.getElementById('category-modal-title').textContent = "Crear Categoría";
            document.getElementById('form-category-id').value = "";
            document.getElementById('form-category-name').value = "";
            document.getElementById('form-category-icon').value = "restaurant";
            document.getElementById('category-modal').classList.remove('hidden');
        }
        
        function openEditCategoryModal(catId) {
            const cat = categories.find(c => c.id === catId);
            if (!cat) return;
            
            document.getElementById('category-modal-title').textContent = "Editar Categoría";
            document.getElementById('form-category-id').value = cat.id;
            document.getElementById('form-category-name').value = cat.name;
            document.getElementById('form-category-icon').value = cat.iconName || "restaurant";
            document.getElementById('category-modal').classList.remove('hidden');
        }
        
        function closeCategoryModal() {
            document.getElementById('category-modal').classList.add('hidden');
        }
        
        function saveCategory(e) {
            e.preventDefault();
            const id = document.getElementById('form-category-id').value;
            const name = document.getElementById('form-category-name').value.trim();
            const iconName = document.getElementById('form-category-icon').value;
            
            if (!name) return;
            
            const url = id ? '/api/admin/edit-category' : '/api/admin/add-category';
            const payload = id ? { categoryId: parseInt(id), name, iconName } : { name, iconName };
            
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    closeCategoryModal();
                    fetchUpdates();
                } else {
                    alert("Error al guardar la categoría: " + (data.message || "error desconocido"));
                }
            })
            .catch(err => {
                console.error("Error guardando categoría:", err);
                alert("Error de red.");
            });
        }
        
        function deleteCategory(catId) {
            const cat = categories.find(c => c.id === catId);
            if (!cat) return;
            
            const productsInCat = products.filter(p => p.categoryId === catId);
            let msg = `¿Está seguro de que desea eliminar la categoría "${cat.name}"?`;
            if (productsInCat.length > 0) {
                msg += `\n\n⚠️ ¡ATENCIÓN! Hay ${productsInCat.length} productos asociados a esta categoría. Al eliminarla, estos productos se reasignarán automáticamente a la primera categoría disponible.`;
            }
            
            if (!confirm(msg)) return;
            
            fetch('/api/admin/delete-category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId: catId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    fetchUpdates();
                } else {
                    alert("Error al eliminar la categoría: " + (data.message || "error desconocido"));
                }
            })
            .catch(err => {
                console.error("Error al eliminar categoría:", err);
                alert("Error de red.");
            });
        }

        function switchTab(tabId) {
            currentTab = tabId;
            const viewIds = ['view-pedidos', 'view-pagos', 'view-mesas', 'view-inventario', 'view-ventas', 'view-qr', 'view-config'];
            const tabBtnIds = ['tab-pedidos', 'tab-pagos', 'tab-mesas', 'tab-inventario', 'tab-reportes', 'tab-ventas', 'tab-qr', 'tab-config'];

            viewIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            tabBtnIds.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.className = "flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all relative";
                }
            });

            const targetView = document.getElementById(`view-${tabId}`);
            const targetTab = document.getElementById(`tab-${tabId}`);
            if (targetView) targetView.classList.remove('hidden');
            if (targetTab) {
                targetTab.className = "flex-1 min-w-[130px] py-3 px-3 rounded-xl font-bold text-xs sm:text-sm text-purple-700 bg-purple-50 flex items-center justify-center gap-1.5 transition-all relative";
            }

            if (tabId === 'pedidos') {
                renderOrders();
            } else if (tabId === 'pagos') {
                renderPaymentReferences();
            } else if (tabId === 'mesas') {
                renderTableStatus();
            } else if (tabId === 'inventario') {
                renderProducts();
            } else if (tabId === 'ventas') {
                renderVentas();
            } else if (tabId === 'qr') {
                generateQRCards();
            }
        }

        function renderPaymentReferences() {
            const tbody = document.getElementById('payment-refs-table');
            if (!tbody) return;
            tbody.innerHTML = "";

            const pmOrders = orders.filter(o => {
                const pm = String(o.paymentMethod || "").toLowerCase();
                return (
                    (pm.includes("pago") || pm.includes("movil") || o.paymentReference || o.paymentVerificationStatus === 'PENDING' || o.paymentVerificationStatus === 'VERIFIED' || o.paymentVerificationStatus === 'REJECTED') &&
                    o.status !== 'CANCELLED'
                );
            });

            // Actualizar badge en la pestaña
            const pendingCount = orders.filter(o => o.paymentVerificationStatus === 'PENDING' && o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED').length;
            const badge = document.getElementById('badge-pagos-pendientes');
            if (badge) {
                badge.textContent = `${pendingCount}`;
                if (pendingCount > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }

            if (pmOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-10 text-slate-400">
                            <span class="material-icons text-4xl block mb-2 text-slate-300">receipt_long</span>
                            No hay reportes de Pago Móvil registrados todavía.
                        </td>
                    </tr>
                `;
                return;
            }

            // Ordenar: PENDING primero, luego por id descendente
            pmOrders.sort((a, b) => {
                if (a.paymentVerificationStatus === 'PENDING' && b.paymentVerificationStatus !== 'PENDING') return -1;
                if (a.paymentVerificationStatus !== 'PENDING' && b.paymentVerificationStatus === 'PENDING') return 1;
                return (b.id || 0) - (a.id || 0);
            });

            pmOrders.forEach(o => {
                const tr = document.createElement('tr');
                tr.className = o.paymentVerificationStatus === 'PENDING' ? "bg-amber-50/60 hover:bg-amber-50 transition border-b border-slate-100" : "hover:bg-slate-50 transition border-b border-slate-100";

                let statusBadge = "";
                if (o.paymentVerificationStatus === 'VERIFIED' || o.paymentStatus === 'PAID') {
                    statusBadge = `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1"><span class="material-icons text-xs">check_circle</span> APROBADO</span>`;
                } else if (o.paymentVerificationStatus === 'REJECTED') {
                    statusBadge = `<span class="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1"><span class="material-icons text-xs">cancel</span> RECHAZADO</span>`;
                } else if (o.paymentVerificationStatus === 'PENDING') {
                    statusBadge = `<span class="bg-amber-200 text-amber-950 border border-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1 animate-pulse"><span class="material-icons text-xs">hourglass_top</span> POR APROBAR</span>`;
                } else {
                    statusBadge = `<span class="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black px-2.5 py-1 rounded-full">Sin referencia</span>`;
                }

                const totalBs = (o.totalUsd * exchangeRate).toFixed(2);
                const refText = o.paymentReference 
                    ? `<span class="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-xs">${o.paymentReference}</span>` 
                    : `<span class="text-slate-400 italic">Pendiente de envío</span>`;
                const bankInfo = (o.paymentOriginBank || o.paymentPhone) 
                    ? `<span class="font-bold text-slate-700">${o.paymentOriginBank || '-'}</span><br><span class="text-[10px] text-slate-500">${o.paymentPhone || ''}</span>` 
                    : `<span class="text-slate-400">-</span>`;

                let actionHtml = "";
                if (o.paymentVerificationStatus === 'PENDING' || (o.paymentStatus !== 'PAID' && o.paymentReference)) {
                    actionHtml = `
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="verifyPaymentRef(${o.id}, 'VERIFIED')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1 active:scale-95">
                                <span class="material-icons text-xs">check</span> Aprobar
                            </button>
                            <button onclick="verifyPaymentRef(${o.id}, 'REJECTED')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs px-2.5 py-1.5 rounded-xl border border-rose-200 transition active:scale-95">
                                <span class="material-icons text-xs">close</span> Rechazar
                            </button>
                        </div>
                    `;
                } else if (o.paymentStatus === 'PAID') {
                    actionHtml = `
                        <div class="flex items-center justify-end gap-1.5">
                            <span class="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5"><span class="material-icons text-xs">verified</span> Cobrado</span>
                            <button onclick="openAdminTicketModal(${o.id})" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-2 py-1 rounded-lg border border-purple-200 transition flex items-center gap-1">
                                <span class="material-icons text-xs">receipt_long</span> Ticket
                            </button>
                        </div>
                    `;
                } else {
                    actionHtml = `
                        <div class="flex items-center justify-end gap-1">
                            <button onclick="openPaymentModal(${o.id})" class="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1">
                                <span class="material-icons text-xs">point_of_sale</span> Cobrar
                            </button>
                        </div>
                    `;
                }

                tr.innerHTML = `
                    <td class="p-3">
                        <span class="font-black bg-slate-900 text-white text-xs px-2 py-0.5 rounded-md">#${o.id}</span>
                        <span class="text-[10px] text-slate-400 block mt-0.5">${o.timestamp || ''}</span>
                    </td>
                    <td class="p-3 font-bold text-slate-800">
                        ${o.tableNumber}
                        <span class="block text-[10px] text-slate-400 font-normal">${o.orderType === 'TAKEAWAY' ? 'Para Llevar' : 'En Salón'}</span>
                    </td>
                    <td class="p-3 font-bold text-slate-900">
                        <span class="text-emerald-700">${totalBs} Bs</span>
                        <span class="text-[10px] text-slate-500 block">($${o.totalUsd.toFixed(2)})</span>
                    </td>
                    <td class="p-3">${refText}</td>
                    <td class="p-3">${bankInfo}</td>
                    <td class="p-3">${statusBadge}</td>
                    <td class="p-3 text-right">${actionHtml}</td>
                `;

                tbody.appendChild(tr);
            });
        }

        function verifyPaymentRef(orderId, status) {
            const actionName = status === 'VERIFIED' ? "aprobar y registrar como PAGADO" : "RECHAZAR";
            if (!confirm(`¿Está seguro de que desea ${actionName} el pago del pedido #${orderId}?`)) return;

            fetch('/api/admin/verify-payment-ref', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId, status: status })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast(status === 'VERIFIED' ? `¡Pago del Pedido #${orderId} APROBADO exitosamente!` : `Pago del Pedido #${orderId} Rechazado.`, status === 'REJECTED');
                    fetchUpdates();
                } else {
                    alert("Error: " + (data.message || "No se pudo actualizar el estado del pago."));
                }
            })
            .catch(err => {
                console.error("Error verificando pago:", err);
                alert("Error de conexión al procesar la verificación.");
            });
        }

        function saveBusinessConfig() {
            const name = document.getElementById('cfg-restaurant-name').value.trim();
            const slogan = document.getElementById('cfg-restaurant-slogan').value.trim();
            const logo = document.getElementById('cfg-restaurant-logo').value.trim();
            const rif = (document.getElementById('cfg-restaurant-rif') ? document.getElementById('cfg-restaurant-rif').value.trim() : "");
            const address = (document.getElementById('cfg-restaurant-address') ? document.getElementById('cfg-restaurant-address').value.trim() : "");
            const resPhone = (document.getElementById('cfg-restaurant-phone') ? document.getElementById('cfg-restaurant-phone').value.trim() : "");
            const instagram = (document.getElementById('cfg-restaurant-instagram') ? document.getElementById('cfg-restaurant-instagram').value.trim() : "");
            const ticketFooter = (document.getElementById('cfg-ticket-footer') ? document.getElementById('cfg-ticket-footer').value.trim() : "");

            const bank = document.getElementById('cfg-pm-bank').value.trim();
            const phone = document.getElementById('cfg-pm-phone').value.trim();
            const idNumber = document.getElementById('cfg-pm-id').value.trim();
            const accountName = document.getElementById('cfg-pm-name').value.trim();

            if (!name) {
                alert("El nombre del restaurante no puede estar vacío.");
                return;
            }

            const payload = {
                restaurantName: name,
                restaurantSlogan: slogan,
                restaurantLogo: logo,
                restaurantRif: rif,
                restaurantAddress: address,
                restaurantPhone: resPhone,
                restaurantInstagram: instagram,
                ticketFooter: ticketFooter,
                pagoMovil: {
                    bank: bank,
                    phone: phone,
                    idNumber: idNumber,
                    accountName: accountName
                }
            };

            fetch('/api/admin/update-business-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    showToast("✅ ¡Configuración de negocio y diseño de Tickets guardados con éxito!", false);
                    const prev = document.getElementById('cfg-logo-preview');
                    const placeholder = document.getElementById('cfg-logo-placeholder');
                    if (logo) {
                        if (prev) { prev.src = logo; prev.classList.remove('hidden'); }
                        if (placeholder) placeholder.classList.add('hidden');
                    } else {
                        if (prev) prev.classList.add('hidden');
                        if (placeholder) placeholder.classList.remove('hidden');
                    }
                    updateLiveTicketPreview();
                } else {
                    alert("Error: " + (data.message || "No se pudo guardar la configuración."));
                }
            })
            .catch(err => {
                console.error("Error guardando config:", err);
                alert("Error de conexión al guardar.");
            });
        }

        function handleLogoUpload(input) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                if (file.size > 2 * 1024 * 1024) {
                    alert("La imagen es demasiado pesada. Por favor selecciona una imagen menor a 2MB.");
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    document.getElementById('cfg-restaurant-logo').value = base64;
                    const prev = document.getElementById('cfg-logo-preview');
                    const placeholder = document.getElementById('cfg-logo-placeholder');
                    if (prev) { prev.src = base64; prev.classList.remove('hidden'); }
                    if (placeholder) placeholder.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        }

        function generateQRCards() {
            const baseUrl = document.getElementById('qr-base-url').value.trim();
            const startTable = parseInt(document.getElementById('qr-start-table').value) || 1;
            const endTable = parseInt(document.getElementById('qr-end-table').value) || 10;
            const includeKitchen = document.getElementById('qr-include-kitchen').checked;
            const container = document.getElementById('qr-cards-container');
            
            container.innerHTML = "";
            
            if (!baseUrl) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-8 bg-amber-50 rounded-2xl border border-dashed border-amber-200">
                        <span class="material-icons text-amber-500 text-4xl mb-2">warning</span>
                        <p class="text-amber-700 text-sm font-bold">Por favor ingresa un enlace base válido</p>
                    </div>
                `;
                return;
            }
            
            let baseDomain = baseUrl;
            if (baseDomain.endsWith('/')) {
                baseDomain = baseDomain.slice(0, -1);
            }

            // 1. Si se solicita, añadir primero la tarjeta del modo cocina
            if (includeKitchen) {
                const kitchenUrl = `${baseDomain}/kitchen`;
                const card = document.createElement('div');
                card.className = "bg-white border-2 border-emerald-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden max-w-sm mx-auto aspect-[3/4] hover:shadow-md transition page-break-inside-avoid";
                card.innerHTML = `
                    <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
                    
                    <div class="mt-2">
                        <h4 class="text-lg font-black text-slate-900 tracking-tight">PANTALLA DE COCINA</h4>
                        <p class="text-[9px] text-emerald-600 font-extrabold uppercase tracking-widest mt-0.5">Control de Comandas (KDS)</p>
                    </div>

                    <div class="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner flex items-center justify-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(kitchenUrl)}" class="w-36 h-36 object-contain rounded-lg" alt="QR Pantalla Cocina">
                    </div>

                    <div class="space-y-1">
                        <span class="text-[11px] text-slate-400 font-semibold block">Escanear con tablet o celular en</span>
                        <span class="text-2xl font-black text-emerald-700 tracking-tight block">ÁREA DE COCINA</span>
                    </div>

                    <div class="mt-3 border-t border-slate-100 pt-3 w-full grid grid-cols-3 gap-1.5 text-[8px] text-slate-500 font-medium">
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold mb-1">1</span>
                            <span>Abre Cocina</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold mb-1">2</span>
                            <span>Recibe Pedido</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold mb-1">3</span>
                            <span>Despacha</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            }
            
            // 2. Generar tarjetas de mesas
            for (let i = startTable; i <= endTable; i++) {
                const targetUrl = `${baseDomain}/?mesa=${i}`;
                
                const card = document.createElement('div');
                card.className = "bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden max-w-sm mx-auto aspect-[3/4] hover:shadow-md transition page-break-inside-avoid";
                card.innerHTML = `
                    <div class="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                    
                    <div class="mt-2">
                        <h4 class="text-lg font-black text-slate-900 tracking-tight">GastroLocal</h4>
                        <p class="text-[9px] text-purple-600 font-extrabold uppercase tracking-widest mt-0.5">Menú Digital Autogestionado</p>
                    </div>

                    <div class="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner flex items-center justify-center">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(targetUrl)}" class="w-36 h-36 object-contain rounded-lg" alt="QR Mesa ${i}">
                    </div>

                    <div class="space-y-1">
                        <span class="text-[11px] text-slate-400 font-semibold block">Escanea y pide directo de tu</span>
                        <span class="text-2xl font-black text-purple-700 tracking-tight block">MESA ${i}</span>
                    </div>

                    <div class="mt-3 border-t border-slate-100 pt-3 w-full grid grid-cols-3 gap-1.5 text-[8px] text-slate-500 font-medium">
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center font-bold mb-1">1</span>
                            <span>Escanea QR</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center font-bold mb-1">2</span>
                            <span>Elige plato</span>
                        </div>
                        <div class="flex flex-col items-center">
                            <span class="w-4 h-4 bg-purple-50 text-purple-700 rounded-full flex items-center justify-center font-bold mb-1">3</span>
                            <span>Recibe orden</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            }
        }

        function setOrderFilter(filterId) {
            orderFilter = filterId;
            
            // Actualizar clases de botones
            document.getElementById('btn-filter-pending').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            document.getElementById('btn-filter-preparing').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            document.getElementById('btn-filter-historial').className = "px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";

            if (filterId === 'PENDING') {
                document.getElementById('btn-filter-pending').className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition";
            } else if (filterId === 'PREPARING') {
                document.getElementById('btn-filter-preparing').className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition";
            } else if (filterId === 'HISTORIAL') {
                document.getElementById('btn-filter-historial').className = "px-4 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition";
            }

            renderOrders();
        }

        function parseTableNum(tableStr) {
            if (!tableStr) return null;
            const str = String(tableStr).trim();
            if (str.toLowerCase().includes("llevar")) return null;
            const match = str.match(/\d+/);
            return match ? parseInt(match[0], 10) : null;
        }

        function setTableFilter(filter) {
            tableFilter = filter;
            renderTableStatus();
        }

        function updateTableStateServer(tableNum, params) {
            params.tableNum = tableNum;
            fetch('/api/admin/update-table-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    tableStates = data.tableStates || {};
                    renderTableStatus();
                } else {
                    alert("Error al actualizar estado de la mesa.");
                }
            })
            .catch(err => {
                console.error("Error al actualizar mesa:", err);
            });
        }

        function setTableStatusManual(tableNum, newStatus) {
            const current = tableStates[String(tableNum)] || { status: 'FREE', pax: 0, capacity: 4 };
            let pax = current.pax || 0;
            if (newStatus === 'FREE' || newStatus === 'CLEANING') {
                pax = 0;
            } else if (newStatus === 'OCCUPIED_DECIDING' && pax === 0) {
                pax = 2; // Por defecto asigna 2 comensales al ocupar mesa decidiendo
            }
            updateTableStateServer(tableNum, { status: newStatus, pax: pax });
        }

        function changeTablePax(tableNum, delta) {
            const current = tableStates[String(tableNum)] || { status: 'FREE', pax: 0, capacity: 4 };
            const cap = current.capacity || 4;
            let newPax = (current.pax || 0) + delta;
            if (newPax < 0) newPax = 0;
            if (newPax > cap) newPax = cap;
            
            let status = current.status || 'FREE';
            if (newPax > 0 && status === 'FREE') {
                status = 'OCCUPIED_DECIDING';
            } else if (newPax === 0 && status === 'OCCUPIED_DECIDING') {
                status = 'FREE';
            }

            updateTableStateServer(tableNum, { pax: newPax, status: status });
        }

        function promptChangeTableCapacity(tableNum) {
            const current = tableStates[String(tableNum)] || { capacity: 4 };
            const val = prompt(`Ingrese la cantidad total de SILLAS / Capacidad de la Mesa ${tableNum}:`, current.capacity || 4);
            if (val !== null) {
                const num = parseInt(val.trim(), 10);
                if (!isNaN(num) && num > 0) {
                    updateTableStateServer(tableNum, { capacity: num });
                } else {
                    alert("Por favor ingrese un número entero de sillas válido.");
                }
            }
        }

        function calcElapsedMinutes(timestampStr) {
            if (!timestampStr) return 0;
            try {
                const now = new Date();
                const parts = timestampStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (parts) {
                    let hours = parseInt(parts[1], 10);
                    const minutes = parseInt(parts[2], 10);
                    const ampm = parts[3];
                    if (ampm) {
                        if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
                        if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
                    }
                    const orderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
                    const diffMs = now - orderTime;
                    const diffMins = Math.floor(diffMs / 60000);
                    return diffMins > 0 ? diffMins : 0;
                }
            } catch(e) {}
            return 0;
        }

        function clearTableCall(tableNum) {
            fetch('/api/admin/clear-table-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableNum: String(tableNum) })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    tableStates = data.tableStates || {};
                    renderTableStatus();
                }
            });
        }

        function openTransferTableModal(fromTable) {
            const toTable = prompt(`Mover pedido de Mesa ${fromTable} a otra Mesa.

Ingrese el NÚMERO de la Mesa Destino:`);
            if (toTable) {
                const cleanTo = parseInt(toTable.trim(), 10);
                if (!isNaN(cleanTo) && cleanTo > 0 && cleanTo !== fromTable) {
                    fetch('/api/admin/transfer-table', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fromTable: String(fromTable), toTable: String(cleanTo) })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            orders = data.orders || orders;
                            tableStates = data.tableStates || tableStates;
                            renderOrders();
                            renderTableStatus();
                            showToast(`Mesa ${fromTable} transferida exitosamente a Mesa ${cleanTo}`, false);
                        } else {
                            alert("Error: " + (data.message || "No se pudo transferir"));
                        }
                    });
                }
            }
        }

        function openMergeTablesModal(mainTable) {
            const secTable = prompt(`Unir / Fusionar otra mesa con Mesa ${mainTable}.

Ingrese el NÚMERO de la Mesa Secundaria a fusionar con Mesa ${mainTable}:`);
            if (secTable) {
                const cleanSec = parseInt(secTable.trim(), 10);
                if (!isNaN(cleanSec) && cleanSec > 0 && cleanSec !== mainTable) {
                    fetch('/api/admin/merge-tables', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ mainTable: String(mainTable), secondaryTable: String(cleanSec) })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            orders = data.orders || orders;
                            tableStates = data.tableStates || tableStates;
                            renderOrders();
                            renderTableStatus();
                            showToast(`Mesa ${cleanSec} unida a Mesa ${mainTable}`, false);
                        } else {
                            alert("Error: " + (data.message || "No se pudo fusionar"));
                        }
                    });
                }
            }
        }

        function openCashRegisterModal() {
            fetch('/api/admin/close-cash-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Cierre de Turno Administrador' })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    const r = data.report;
                    document.getElementById('z-report-date').textContent = `Fecha: ${r.timestamp} • Tasa Cambiaria: ${r.exchangeRate} Bs/$`;
                    
                    const content = document.getElementById('z-report-content');
                    content.innerHTML = `
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">Ventas Totales ($)</span>
                                <span class="text-2xl font-black text-emerald-700 block mt-0.5">$${r.totalUsd.toFixed(2)}</span>
                            </div>
                            <div class="bg-teal-50 border border-teal-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-teal-800 uppercase tracking-wider block">Ventas en Bs</span>
                                <span class="text-2xl font-black text-teal-700 block mt-0.5">${r.totalBs.toFixed(2)} Bs</span>
                            </div>
                            <div class="bg-purple-50 border border-purple-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block">Pedidos Cobrados</span>
                                <span class="text-2xl font-black text-purple-700 block mt-0.5">${r.totalOrdersPaid}</span>
                            </div>
                            <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                                <span class="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider block">Ticket Promedio</span>
                                <span class="text-2xl font-black text-blue-700 block mt-0.5">$${r.avgPerTableUsd.toFixed(2)}</span>
                            </div>
                        </div>

                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                            <h4 class="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <span class="material-icons text-sm text-purple-600">account_balance_wallet</span> Arqueo por Método de Pago
                            </h4>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Efectivo USD</span>
                                    <span class="font-extrabold text-slate-900 text-sm">$${r.methodBreakdownUsd.CASH_USD.toFixed(2)}</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Efectivo Bs</span>
                                    <span class="font-extrabold text-slate-900 text-sm">${r.methodBreakdownBs.CASH_BS.toFixed(2)} Bs</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Pago Móvil</span>
                                    <span class="font-extrabold text-slate-900 text-sm">${r.methodBreakdownBs.PAGO_MOVIL.toFixed(2)} Bs</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Punto de Venta</span>
                                    <span class="font-extrabold text-slate-900 text-sm">${r.methodBreakdownBs.PUNTO.toFixed(2)} Bs</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Zelle</span>
                                    <span class="font-extrabold text-slate-900 text-sm">$${r.methodBreakdownUsd.ZELLE.toFixed(2)}</span>
                                </div>
                                <div class="bg-white p-3 rounded-xl border border-slate-200">
                                    <span class="text-slate-400 font-medium block">Otros</span>
                                    <span class="font-extrabold text-slate-900 text-sm">$${r.methodBreakdownUsd.OTROS.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById('cash-register-modal').classList.remove('hidden');
                }
            });
        }

        function closeCashRegisterModal() {
            document.getElementById('cash-register-modal').classList.add('hidden');
        }

        function printZReport() {
            document.body.classList.add('printing-z-report');
            window.print();
            setTimeout(() => {
                document.body.classList.remove('printing-z-report');
            }, 1000);
        }

        window.addEventListener('afterprint', () => {
            document.body.classList.remove('printing-z-report');
        });

        function confirmCloseCashRegister() {
            fetch('/api/admin/close-cash-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'confirm', notes: 'Cierre de Turno Administrador' })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    if (data.orders) {
                        orders = data.orders;
                    }
                    closeCashRegisterModal();
                    if (typeof renderVentas === 'function') renderVentas();
                    if (typeof renderOrders === 'function') renderOrders();
                    if (typeof renderTableStatus === 'function') renderTableStatus();
                    showToast("🔒 ¡Cierre de Caja registrado y archivado exitosamente! El nuevo turno inicia en $0.00.", false);
                } else {
                    alert("Error al registrar Cierre de Caja: " + (data.message || "Desconocido"));
                }
            })
            .catch(err => {
                alert("Error de comunicación al registrar Cierre de Caja: " + err.message);
            });
        }

        function renderTableStatus() {
            const totalTables = totalTablesConfig || 10;
            
            // Map table number -> list of active unpaid dine-in orders
            const tableOrders = {};
            orders.forEach(o => {
                const isCancelled = o.status === "CANCELLED";
                const isPaid = o.paymentStatus === "PAID";
                if (!isCancelled && !isPaid) {
                    const tableNum = parseTableNum(o.tableNumber);
                    if (tableNum) {
                        if (!tableOrders[tableNum]) {
                            tableOrders[tableNum] = [];
                        }
                        tableOrders[tableNum].push(o);
                    }
                }
            });

            let occupiedTablesCount = 0;
            let totalSalonChairs = 0;
            let occupiedChairsCount = 0;

            for (let t = 1; t <= totalTables; t++) {
                const activeOrders = tableOrders[t] || [];
                const saved = tableStates[String(t)] || { status: 'FREE', pax: 0, capacity: 4, notes: '' };
                const capacity = saved.capacity || 4;
                totalSalonChairs += capacity;

                let effectiveStatus = saved.status || 'FREE';
                if (activeOrders.length > 0) {
                    effectiveStatus = 'OCCUPIED_ORDER';
                }

                const isOccupied = (effectiveStatus !== 'FREE' && effectiveStatus !== 'CLEANING');
                if (isOccupied) {
                    occupiedTablesCount++;
                    let paxVal = saved.pax > 0 ? saved.pax : 2;
                    occupiedChairsCount += paxVal;
                }
            }

            const freeTablesCount = Math.max(0, totalTables - occupiedTablesCount);
            const freeChairsCount = Math.max(0, totalSalonChairs - occupiedChairsCount);
            const occupancyPercent = totalTables > 0 ? Math.round((occupiedTablesCount / totalTables) * 100) : 0;

            // Actualizar elementos KPI
            const elTotal = document.getElementById('kpi-total-tables');
            if (elTotal) elTotal.textContent = totalTables;
            
            const elBtnLabel = document.getElementById('label-total-tables-btn');
            if (elBtnLabel) elBtnLabel.textContent = totalTables + " Mesas";

            const elOccupied = document.getElementById('kpi-occupied-tables');
            if (elOccupied) elOccupied.textContent = occupiedTablesCount;

            const elFree = document.getElementById('kpi-free-tables');
            if (elFree) elFree.textContent = freeTablesCount;

            const elTotalChairs = document.getElementById('kpi-total-chairs');
            if (elTotalChairs) elTotalChairs.textContent = totalSalonChairs;

            const elOccChairs = document.getElementById('kpi-occupied-chairs');
            if (elOccChairs) elOccChairs.textContent = occupiedChairsCount;

            const elFreeChairs = document.getElementById('kpi-free-chairs');
            if (elFreeChairs) elFreeChairs.textContent = freeChairsCount;

            const elPercent = document.getElementById('kpi-occupancy-percent');
            if (elPercent) elPercent.textContent = occupancyPercent + "%";

            const elBar = document.getElementById('kpi-occupancy-bar');
            if (elBar) elBar.style.width = occupancyPercent + "%";

            const elLabelOcc = document.getElementById('kpi-occupancy-label');
            if (elLabelOcc) {
                if (occupancyPercent >= 90) {
                    elLabelOcc.textContent = "🔥 Salón Casi Lleno";
                } else if (occupancyPercent >= 50) {
                    elLabelOcc.textContent = "⚡ Ocupación Media";
                } else {
                    elLabelOcc.textContent = "✨ Salón Con Capacidad Libre";
                }
            }

            const elCountsAll = document.getElementById('count-tables-all');
            if (elCountsAll) elCountsAll.textContent = totalTables;

            const elCountsOcc = document.getElementById('count-tables-occupied');
            if (elCountsOcc) elCountsOcc.textContent = occupiedTablesCount;

            const elCountsFree = document.getElementById('count-tables-free');
            if (elCountsFree) elCountsFree.textContent = freeTablesCount;

            // Header Pill
            const elHeaderPill = document.getElementById('orders-header-table-status');
            if (elHeaderPill) {
                elHeaderPill.textContent = `Salón: ${occupiedTablesCount}/${totalTables} Mesas (${occupiedChairsCount}/${totalSalonChairs} Sillas)`;
            }

            const badgeOccupied = document.getElementById('badge-mesas-ocupadas');
            if (badgeOccupied) {
                badgeOccupied.textContent = occupiedTablesCount + " Ocupadas";
                if (occupiedTablesCount > 0) {
                    badgeOccupied.className = "bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse";
                } else {
                    badgeOccupied.className = "bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm";
                }
            }

            // Actualizar botones de filtro
            const btnAll = document.getElementById('btn-table-filter-all');
            const btnOcc = document.getElementById('btn-table-filter-occupied');
            const btnFree = document.getElementById('btn-table-filter-free');

            if (btnAll) btnAll.className = tableFilter === 'ALL' ? "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition" : "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            if (btnOcc) btnOcc.className = tableFilter === 'OCCUPIED' ? "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition" : "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";
            if (btnFree) btnFree.className = tableFilter === 'FREE' ? "px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-800 shadow-sm transition" : "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-white/50 transition";

            // Renderizar Grid de Mesas
            const container = document.getElementById('tables-grid');
            if (!container) return;
            container.innerHTML = "";

            for (let t = 1; t <= totalTables; t++) {
                const activeOrders = tableOrders[t] || [];
                const saved = tableStates[String(t)] || { status: 'FREE', pax: 0, capacity: 4, notes: '' };
                const capacity = saved.capacity || 4;
                
                let effectiveStatus = saved.status || 'FREE';
                if (activeOrders.length > 0) {
                    effectiveStatus = 'OCCUPIED_ORDER';
                }

                if (tableFilter === 'OCCUPIED' && effectiveStatus === 'FREE') continue;
                if (tableFilter === 'FREE' && effectiveStatus !== 'FREE') continue;

                let pax = saved.pax || 0;
                if (effectiveStatus === 'OCCUPIED_ORDER' && pax === 0) pax = 2;

                let chairsHtml = "";
                for (let i = 1; i <= capacity; i++) {
                    const isChairOccupied = (i <= pax) && (effectiveStatus !== 'FREE' && effectiveStatus !== 'CLEANING');
                    chairsHtml += `
                        <span class="material-icons text-base ${isChairOccupied ? 'text-amber-600 drop-shadow-sm scale-110' : 'text-slate-300 opacity-60'}" title="Silla ${i} (${isChairOccupied ? 'Ocupada' : 'Libre'})">
                            event_seat
                        </span>
                    `;
                }

                // Banner de Llamada de Mesero / Cuenta
                let callBannerHtml = "";
                if (saved.call) {
                    const isWaiter = saved.call.type === 'WAITER';
                    callBannerHtml = `
                        <div class="${isWaiter ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'} p-2.5 rounded-2xl flex items-center justify-between shadow-md animate-bounce my-2">
                            <div class="flex items-center gap-1.5 font-black text-xs">
                                <span class="material-icons text-base">${isWaiter ? 'notifications_active' : 'receipt_long'}</span>
                                <span>${isWaiter ? '¡PIDE MESERO!' : '¡SOLICITA CUENTA!'}</span>
                                <span class="opacity-75 text-[10px]">(${saved.call.time || ''})</span>
                            </div>
                            <button onclick="clearTableCall(${t})" class="bg-slate-950 text-white hover:bg-slate-800 font-bold text-[10px] px-2.5 py-1 rounded-xl transition active:scale-95 shadow">
                                Atendido ✓
                            </button>
                        </div>
                    `;
                }

                const card = document.createElement('div');

                if (effectiveStatus === 'OCCUPIED_ORDER') {
                    const primaryOrder = activeOrders[0];
                    const ordersCount = activeOrders.length;
                    const tableTotalUsd = activeOrders.reduce((sum, o) => sum + o.totalUsd, 0);
                    const tableTotalBs = (tableTotalUsd * exchangeRate).toFixed(2);
                    const totalItemsCount = activeOrders.reduce((sum, o) => sum + (o.items ? o.items.reduce((iSum, item) => iSum + item.quantity, 0) : 0), 0);
                    const orderIdsStr = activeOrders.map(o => '#' + String(o.id).padStart(3, '0')).join(', ');

                    const statusLabelMap = {
                        "PENDING": "En Espera",
                        "CONFIRMED": "Preparando",
                        "PREPARING": "En Cocina",
                        "READY": "Servido",
                        "DELIVERED": "Consumiendo"
                    };
                    const currentStatusText = statusLabelMap[primaryOrder.status] || primaryOrder.status;

                    // Semáforo de Tiempo máximo de la mesa
                    const maxElapsed = Math.max(...activeOrders.map(o => calcElapsedMinutes(o.timestamp)));
                    let semaforoBadge = `<span class="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> ${maxElapsed} min</span>`;
                    if (maxElapsed >= 10 && maxElapsed <= 20) {
                        semaforoBadge = `<span class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse"><span class="w-2 h-2 rounded-full bg-amber-500"></span> ${maxElapsed} min</span>`;
                    } else if (maxElapsed > 20) {
                        semaforoBadge = `<span class="bg-rose-600 text-white shadow-sm text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-bounce"><span class="material-icons text-xs">warning</span> ${maxElapsed} min CRÍTICO</span>`;
                    }

                    const ordersBadgeText = ordersCount > 1 ? `${ordersCount} PEDIDOS UNIFICADOS` : `CON PEDIDO`;

                    card.className = "bg-gradient-to-br from-purple-50/90 via-white to-amber-50/50 border-2 border-purple-400 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 relative overflow-hidden";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-purple-100 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-purple-500/30">
                                    ${t}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${t}</h4>
                                    <span class="text-[10px] text-purple-700 font-bold block">${orderIdsStr}</span>
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <span class="bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <span class="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span> ${ordersBadgeText}
                                </span>
                                ${semaforoBadge}
                            </div>
                        </div>

                        ${callBannerHtml}

                        <div class="bg-white/80 p-3 rounded-2xl border border-purple-100 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-500 text-[11px]">Sillas / Pax:</span>
                                <div class="flex items-center gap-1">
                                    <button onclick="changeTablePax(${t}, -1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">-</button>
                                    <span class="font-black text-slate-800 text-xs px-1">${pax}/${capacity} Sentados</span>
                                    <button onclick="changeTablePax(${t}, 1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">+</button>
                                    <button onclick="promptChangeTableCapacity(${t})" class="ml-1 text-slate-400 hover:text-purple-600 transition" title="Editar cantidad de sillas">
                                        <span class="material-icons text-xs">settings</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${chairsHtml}
                            </div>
                        </div>

                        <div class="space-y-1.5 text-xs">
                            <div class="flex justify-between items-center text-slate-600">
                                <span class="text-slate-400 font-medium">Estado Cocina:</span>
                                <span class="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">${currentStatusText}</span>
                            </div>
                            <div class="flex justify-between items-center text-slate-600">
                                <span class="text-slate-400 font-medium">Consumo Mesa:</span>
                                <span class="font-bold text-slate-800">${totalItemsCount} productos (${ordersCount} ${ordersCount === 1 ? 'pedido' : 'pedidos'})</span>
                            </div>
                            <div class="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                                <span class="font-black text-purple-900 text-xs">TOTAL MESA COMPLETA:</span>
                                <div class="text-right">
                                    <span class="font-black text-emerald-700 text-base block">$${tableTotalUsd.toFixed(2)}</span>
                                    <span class="text-[11px] text-purple-800 font-bold">${tableTotalBs} Bs</span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-2 border-t border-slate-100 space-y-2">
                            <button onclick="openTablePaymentModal(${t})" class="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-1.5 active:scale-95">
                                <span class="material-icons text-sm">payments</span> Cobrar Mesa Completa ($${tableTotalUsd.toFixed(2)})
                            </button>

                            <div class="grid grid-cols-2 gap-1.5">
                                <button onclick="goToOrderDetails(${primaryOrder.id})" class="bg-purple-100 hover:bg-purple-200 text-purple-800 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1">
                                    <span class="material-icons text-xs">visibility</span> Ver Detalle
                                </button>
                                <button onclick="openTableIndividualPayModal(${t})" class="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1">
                                    <span class="material-icons text-xs">call_split</span> Cobrar Separado
                                </button>
                            </div>

                            <div class="grid grid-cols-2 gap-1.5">
                                <button onclick="openTransferTableModal(${t})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1" title="Cambiar pedido a otra mesa">
                                    <span class="material-icons text-xs">swap_horiz</span> Mover Mesa
                                </button>
                                <button onclick="openMergeTablesModal(${t})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] py-1.5 rounded-xl transition flex items-center justify-center gap-1" title="Unir cuenta con otra mesa">
                                    <span class="material-icons text-xs">call_merge</span> Unir Mesas
                                </button>
                            </div>
                        </div>
                    `;

                } else if (effectiveStatus === 'OCCUPIED_DECIDING' || effectiveStatus === 'OCCUPIED') {
                    card.className = "bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-amber-200 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/20">
                                    ${t}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${t}</h4>
                                    <span class="text-[10px] text-amber-800 font-semibold block">Clientes Sentados</span>
                                </div>
                            </div>
                            <span class="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> DECIDIENDO MENÚ
                            </span>
                        </div>

                        ${callBannerHtml}

                        <div class="bg-white p-3 rounded-2xl border border-amber-200/80 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-600 text-[11px]">Sillas Ocupadas:</span>
                                <div class="flex items-center gap-1">
                                    <button onclick="changeTablePax(${t}, -1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">-</button>
                                    <span class="font-black text-amber-950 text-xs px-1">${pax}/${capacity} Personas</span>
                                    <button onclick="changeTablePax(${t}, 1)" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200 transition active:scale-95">+</button>
                                    <button onclick="promptChangeTableCapacity(${t})" class="ml-1 text-slate-400 hover:text-amber-600 transition" title="Editar cantidad de sillas">
                                        <span class="material-icons text-xs">settings</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${chairsHtml}
                            </div>
                        </div>

                        <div class="py-1 text-center space-y-1">
                            <p class="text-xs font-bold text-amber-900 flex items-center justify-center gap-1">
                                <span class="material-icons text-sm text-amber-600">menu_book</span> Decidiendo pedido por QR
                            </p>
                            <p class="text-[10px] text-slate-500">Los clientes están revisando la carta digital.</p>
                        </div>

                        <div class="pt-2 border-t border-amber-200 grid grid-cols-2 gap-2">
                            <button onclick="setTableStatusManual(${t}, 'FREE')" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs">check_circle</span> Liberar Mesa
                            </button>
                            <button onclick="copyQrForTable(${t})" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs text-purple-600">qr_code</span> Copiar QR
                            </button>
                        </div>
                    `;

                } else if (effectiveStatus === 'RESERVED') {
                    card.className = "bg-sky-50/70 border-2 border-sky-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-sky-200 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-sky-500/20">
                                    ${t}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${t}</h4>
                                    <span class="text-[10px] text-sky-800 font-semibold block">Reservación Especial</span>
                                </div>
                            </div>
                            <span class="bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="material-icons text-xs">bookmark</span> RESERVADA
                            </span>
                        </div>

                        ${callBannerHtml}

                        <div class="bg-white p-3 rounded-2xl border border-sky-200/80 space-y-2 text-center">
                            <span class="material-icons text-2xl text-sky-500">event_available</span>
                            <p class="text-xs font-bold text-sky-950">Mesa Reservada (${capacity} Sillas)</p>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${chairsHtml}
                            </div>
                        </div>

                        <div class="pt-2 border-t border-sky-200 grid grid-cols-2 gap-2">
                            <button onclick="setTableStatusManual(${t}, 'OCCUPIED_DECIDING')" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs">group</span> Ocupar Mesa
                            </button>
                            <button onclick="setTableStatusManual(${t}, 'FREE')" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs text-emerald-600">check</span> Liberar
                            </button>
                        </div>
                    `;

                } else if (effectiveStatus === 'CLEANING') {
                    card.className = "bg-slate-50 border-2 border-slate-300 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 opacity-80";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-slate-400 text-white flex items-center justify-center font-black text-sm">
                                    ${t}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${t}</h4>
                                    <span class="text-[10px] text-slate-500 font-semibold block">Mantenimiento</span>
                                </div>
                            </div>
                            <span class="bg-slate-200 text-slate-800 border border-slate-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="material-icons text-xs">cleaning_services</span> EN LIMPIEZA
                            </span>
                        </div>

                        ${callBannerHtml}

                        <div class="py-2 text-center space-y-1">
                            <span class="material-icons text-2xl text-slate-400">sanitizer</span>
                            <p class="text-xs font-bold text-slate-700">Por Sanitizar / Limpiar</p>
                        </div>

                        <div class="pt-2 border-t border-slate-200">
                            <button onclick="setTableStatusManual(${t}, 'FREE')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs">check_circle</span> Marcar Lista y Libre
                            </button>
                        </div>
                    `;

                } else {
                    card.className = "bg-white border-2 border-slate-200 hover:border-emerald-400 rounded-3xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4";
                    card.innerHTML = `
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                                    ${t}
                                </div>
                                <div>
                                    <h4 class="font-black text-slate-900 text-sm">Mesa ${t}</h4>
                                    <span class="text-[10px] text-slate-400 font-medium block">Salón</span>
                                </div>
                            </div>
                            <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> LIBRE
                            </span>
                        </div>

                        ${callBannerHtml}

                        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-slate-500 text-[11px]">Capacidad Mesa:</span>
                                <div class="flex items-center gap-1">
                                    <span class="font-bold text-slate-800 text-xs">${capacity} Sillas</span>
                                    <button onclick="promptChangeTableCapacity(${t})" class="ml-1 text-slate-400 hover:text-purple-600 transition" title="Editar cantidad de sillas">
                                        <span class="material-icons text-xs">settings</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center justify-center gap-1 pt-1 border-t border-slate-100">
                                ${chairsHtml}
                            </div>
                        </div>

                        <div class="pt-2 border-t border-slate-100 space-y-2">
                            <div class="grid grid-cols-2 gap-2">
                                <button onclick="setTableStatusManual(${t}, 'OCCUPIED_DECIDING')" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-95">
                                    <span class="material-icons text-xs">menu_book</span> Decidiendo
                                </button>
                                <button onclick="setTableStatusManual(${t}, 'RESERVED')" class="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-[11px] py-2 rounded-xl transition flex items-center justify-center gap-1">
                                    <span class="material-icons text-xs">bookmark</span> Reservar
                                </button>
                            </div>
                            <button onclick="copyQrForTable(${t})" class="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-[11px] py-2 rounded-xl border border-slate-200 transition flex items-center justify-center gap-1">
                                <span class="material-icons text-xs text-purple-600">qr_code</span> Copiar Enlace QR
                            </button>
                        </div>
                    `;
                }

                container.appendChild(card);
            }
        }

        function promptUpdateTotalTables() {
            const current = totalTablesConfig || 10;
            const input = prompt("Ingrese la cantidad total de mesas de su establecimiento:", current);
            if (input !== null) {
                const val = parseInt(input.trim(), 10);
                if (!isNaN(val) && val > 0) {
                    fetch('/api/admin/update-total-tables', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ totalTables: val })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            totalTablesConfig = data.totalTables;
                            renderTableStatus();
                            alert(`Capacidad de mesas actualizada correctamente a ${data.totalTables} mesas.`);
                        } else {
                            alert("Error al actualizar la capacidad de mesas.");
                        }
                    })
                    .catch(err => {
                        console.error("Error al actualizar totalTables:", err);
                        alert("Error de conexión al guardar mesas.");
                    });
                } else {
                    alert("Por favor ingrese un número entero válido mayor a 0.");
                }
            }
        }

        function copyQrForTable(tableNum) {
            const serverIp = "{get_ip_address()}";
            const serverPort = window.location.port || "8000";
            const tableUrl = `http://${serverIp}:${serverPort}/?table=${tableNum}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(tableUrl).then(() => {
                    alert(`¡Enlace directo para Mesa ${tableNum} copiado al portapapeles!

${tableUrl}`);
                }).catch(() => {
                    prompt(`Enlace directo para Mesa ${tableNum}:`, tableUrl);
                });
            } else {
                prompt(`Enlace directo para Mesa ${tableNum}:`, tableUrl);
            }
        }

        function goToOrderDetails(orderId) {
            switchTab('pedidos');
            setOrderFilter('PREPARING');
            setTimeout(() => {
                const el = document.getElementById(`order-card-${orderId}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-4', 'ring-purple-500');
                    setTimeout(() => el.classList.remove('ring-4', 'ring-purple-500'), 3000);
                }
            }, 150);
        }

        function renderOrders() {
            const container = document.getElementById('orders-monitor');
            container.innerHTML = "";

            let filteredOrders = [];
            if (orderFilter === "PENDING") {
                filteredOrders = orders.filter(o => o.status === "PENDING");
            } else if (orderFilter === "PREPARING") {
                // Cocina: pedidos CONFIRMED (preparando) o READY (listo) o DELIVERED que NO estén pagados aún
                filteredOrders = orders.filter(o => o.status === "CONFIRMED" || o.status === "PREPARING" || o.status === "READY" || (o.status === "DELIVERED" && o.paymentStatus !== "PAID"));
            } else {
                // Historial: pedidos DELIVERED y pagados, o CANCELLED
                filteredOrders = orders.filter(o => (o.status === "DELIVERED" && o.paymentStatus === "PAID") || o.status === "CANCELLED");
            }

            if (filteredOrders.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full text-center py-12 text-slate-400">
                        <span class="material-icons text-5xl mb-2">dinner_dining</span>
                        <p class="text-sm">No hay pedidos registrados en este filtro.</p>
                    </div>
                `;
                return;
            }

            filteredOrders.forEach(o => {
                const statusColors = {
                    "PENDING": "bg-yellow-100 text-yellow-800 border-yellow-200",
                    "CONFIRMED": "bg-blue-100 text-blue-800 border-blue-200",
                    "PREPARING": "bg-blue-100 text-blue-800 border-blue-200",
                    "READY": "bg-indigo-100 text-indigo-800 border-indigo-200",
                    "DELIVERED": "bg-emerald-100 text-emerald-800 border-emerald-200",
                    "CANCELLED": "bg-rose-100 text-rose-800 border-rose-200"
                };

                const statusLabel = {
                    "PENDING": "Pendiente",
                    "CONFIRMED": "Preparando",
                    "PREPARING": "Preparando",
                    "READY": "Listo",
                    "DELIVERED": "Entregado",
                    "CANCELLED": "Cancelado"
                };

                const totalBs = (o.totalUsd * exchangeRate).toFixed(2);
                const itemsHtml = o.items.map(it => `
                    <div class="flex justify-between items-center text-sm py-1 border-b border-slate-100">
                        <span class="font-medium"><span class="text-purple-600 font-bold">${it.quantity}x</span> ${it.productName}</span>
                        <span class="text-slate-500">$${it.priceUsd.toFixed(2)} ud</span>
                    </div>
                `).join("");

                let actionButtons = "";
                if (o.status === "PENDING") {
                    actionButtons = `
                        <button onclick="updateOrderStatus(${o.id}, 'CONFIRMED')" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                            <span class="material-icons text-sm">check</span> Confirmar Pedido
                        </button>
                        <button onclick="updateOrderStatus(${o.id}, 'CANCELLED')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs px-3 py-1.5 rounded-lg font-bold transition">
                            Rechazar
                        </button>
                    `;
                } else if (o.status === "CONFIRMED" || o.status === "PREPARING") {
                    actionButtons = `
                        <button onclick="updateOrderStatus(${o.id}, 'READY')" class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                            <span class="material-icons text-sm">restaurant</span> Marcar Listo
                        </button>
                    `;
                } else if (o.status === "READY") {
                    if (o.orderType === "TAKEAWAY") {
                        if (o.paymentStatus !== "PAID") {
                            actionButtons = `
                                <button onclick="openPaymentModal(${o.id})" class="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                    <span class="material-icons text-sm">point_of_sale</span> Cobrar (Para Llevar)
                                </button>
                            `;
                        } else {
                            actionButtons = `
                                <button onclick="updateOrderStatus(${o.id}, 'DELIVERED')" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                    <span class="material-icons text-sm">local_mall</span> Entregar Pedido
                                </button>
                            `;
                        }
                    } else {
                        // DINE_IN
                        actionButtons = `
                            <button onclick="deliverAndCollect(${o.id})" class="bg-teal-600 hover:bg-teal-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                                <span class="material-icons text-sm">room_service</span> Entregar a Mesa
                            </button>
                        `;
                    }
                } else if (o.status === "DELIVERED" && o.paymentStatus !== "PAID") {
                    actionButtons = `
                        <button onclick="openPaymentModal(${o.id})" class="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1">
                            <span class="material-icons text-sm">point_of_sale</span> Cobrar Cuenta (Mesa)
                        </button>
                    `;
                } else {
                    // Pagados o cancelados
                    actionButtons = `
                        <button onclick="openAdminTicketModal(${o.id})" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 transition flex items-center gap-1">
                            <span class="material-icons text-xs">receipt_long</span> Ver Ticket
                        </button>
                    `;
                }

                // If not finalized but paid, also give quick ticket access
                const ticketQuickBtn = (o.paymentStatus === 'PAID' || o.status === 'READY' || o.status === 'DELIVERED') ? `
                    <button onclick="openAdminTicketModal(${o.id})" class="bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 font-bold text-xs p-1.5 rounded-lg transition" title="Ver / Imprimir Ticket">
                        <span class="material-icons text-sm">receipt_long</span>
                    </button>
                ` : '';

                const orderCard = document.createElement('div');
                orderCard.id = `order-card-${o.id}`;
                orderCard.className = `p-5 bg-white border rounded-2xl shadow-sm space-y-4 transition-all ${o.status === 'PENDING' ? 'ring-2 ring-yellow-400' : ''}`;
                
                let paymentLabel = "";
                if (o.paymentStatus === "PAID") {
                    paymentLabel = `<span class="text-xs font-bold text-green-600 flex items-center gap-1"><span class="material-icons text-xs">check_circle</span> PAGADO</span>`;
                } else {
                    paymentLabel = `<span class="text-xs font-bold text-rose-600 flex items-center gap-1"><span class="material-icons text-xs">pending</span> Por Cobrar</span>`;
                }

                const displayPaymentMethod = o.paymentMethod.includes(":") ? "Pago Mixto" : o.paymentMethod;

                orderCard.innerHTML = `
                    <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-black bg-slate-900 text-white px-2.5 py-1 rounded-lg">#${o.id}</span>
                            <span class="font-bold text-slate-800 text-sm">${o.tableNumber}</span>
                            <span class="text-xs text-slate-400">• ${o.timestamp}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${ticketQuickBtn}
                            <span class="text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[o.status] || 'bg-slate-100 text-slate-800'}">
                                ${statusLabel[o.status] || o.status}
                            </span>
                        </div>
                    </div>
 
                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        ${itemsHtml}
                        ${o.notes ? `<p class="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg mt-2 border border-amber-200 font-medium">Nota: ${o.notes}</p>` : ''}
                    </div>
 
                    <div class="flex justify-between items-center border-t border-slate-100 pt-3">
                        <div>
                            <span class="text-xs text-slate-400 block">${o.orderType === 'TAKEAWAY' ? '🚚 PARA LLEVAR' : '🍽️ EN MESA'} • ${displayPaymentMethod}</span>
                            <span class="text-sm font-extrabold text-slate-800">$${o.totalUsd.toFixed(2)} / <span class="text-purple-600">${totalBs} Bs</span></span>
                            <div class="mt-1">${paymentLabel}</div>
                        </div>
                        <div class="flex items-center gap-2">${actionButtons}</div>
                    </div>
                `;
                container.appendChild(orderCard);
            });
        }

        function renderProducts() {
            const container = document.getElementById('products-list');
            container.innerHTML = "";

            products.forEach(p => {
                const statusBtn = p.isAvailable 
                    ? `<button onclick="toggleProduct(${p.id})" class="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] px-2 py-1 rounded font-bold transition">Habilitado</button>`
                    : `<button onclick="toggleProduct(${p.id})" class="bg-rose-100 hover:bg-rose-200 text-rose-800 text-[10px] px-2 py-1 rounded font-bold transition">Deshabilitado</button>`;

                const imgIsBase64 = p.imageUri && p.imageUri.startsWith('data:image');
                const imgHtml = imgIsBase64
                    ? `<img src="${p.imageUri}" class="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0">`
                    : `<div class="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">${p.name.charAt(0).toUpperCase()}</div>`;

                const prodCard = document.createElement('div');
                prodCard.className = `p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 ${!p.isAvailable ? 'opacity-60 bg-slate-50' : ''}`;
                prodCard.innerHTML = `
                    <div class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer" onclick="openEditProductModal(${p.id})" title="Haga clic para editar">
                        ${imgHtml}
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-xs truncate">${p.name}</h4>
                            <p class="text-[9px] text-slate-500 truncate mt-0.5">${p.description || 'Sin descripción.'}</p>
                            <p class="text-[10px] text-purple-600 font-extrabold mt-0.5">$${p.priceUsd.toFixed(2)} / ${ (p.priceUsd * exchangeRate).toFixed(2) } Bs</p>
                        </div>
                    </div>
                    
                    <div class="flex flex-col items-end gap-1.5">
                        <div class="flex items-center gap-1">
                            <!-- Control de Stock -->
                            <div class="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded p-0.5">
                                <span class="text-[9px] font-bold text-slate-500 px-1">Stock:</span>
                                <input type="number" value="${p.stock}" onchange="updateStock(${p.id}, this.value)" class="w-10 text-center text-xs font-bold bg-transparent focus:outline-none">
                            </div>
                            ${statusBtn}
                        </div>
                        <div class="flex gap-1">
                            <button onclick="openEditProductModal(${p.id})" class="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded flex items-center justify-center transition" title="Editar">
                                <span class="material-icons text-xs">edit</span>
                            </button>
                            <button onclick="deleteProduct(${p.id})" class="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded flex items-center justify-center transition" title="Eliminar">
                                <span class="material-icons text-xs">delete</span>
                            </button>
                        </div>
                    </div>
                `;
                container.appendChild(prodCard);
            });
        }

        // COBRANZA MULTIDIVISA & MIXTA (MESA COMPLETA O INDIVIDUAL)
        let activePaymentOrdersList = [];
        let activePaymentTotalAmountUsd = 0;

        function openPaymentModal(orderId) {
            const order = orders.find(o => o.id === orderId);
            if (!order) return;

            activePaymentOrdersList = [order];
            activePaymentTotalAmountUsd = order.totalUsd;
            activePaymentOrderId = orderId;

            document.getElementById('payment-order-id').textContent = `#${order.id}`;
            document.getElementById('payment-order-location').textContent = order.tableNumber;
            document.getElementById('pay-total-usd').textContent = `$${order.totalUsd.toFixed(2)}`;
            document.getElementById('pay-total-bs').textContent = `${(order.totalUsd * exchangeRate).toFixed(2)} Bs`;
            
            // Reset inputs
            document.getElementById('pay-cash-usd').value = "";
            document.getElementById('pay-zelle-usd').value = "";
            document.getElementById('pay-pagomovil-bs').value = "";
            document.getElementById('pay-punto-bs').value = "";
            document.getElementById('pay-cash-bs').value = "";

            calculatePayment();
            document.getElementById('payment-modal').classList.remove('hidden');
        }

        function openTablePaymentModal(tableNum) {
            const tableOrdersList = orders.filter(o => o.status !== "CANCELLED" && o.paymentStatus !== "PAID" && parseTableNum(o.tableNumber) === tableNum);
            if (tableOrdersList.length === 0) {
                alert("No hay pedidos activos por cobrar en Mesa " + tableNum);
                return;
            }

            activePaymentOrdersList = tableOrdersList;
            activePaymentTotalAmountUsd = tableOrdersList.reduce((sum, o) => sum + o.totalUsd, 0);
            activePaymentOrderId = tableOrdersList[0].id; // Referencia primaria

            const orderIdsStr = tableOrdersList.map(o => '#' + String(o.id).padStart(3, '0')).join(', ');

            document.getElementById('payment-order-id').textContent = `Mesa ${tableNum} (${orderIdsStr})`;
            document.getElementById('payment-order-location').textContent = `Mesa ${tableNum} (Mesa Completa - ${tableOrdersList.length} ${tableOrdersList.length === 1 ? 'Pedido' : 'Pedidos'})`;
            document.getElementById('pay-total-usd').textContent = `$${activePaymentTotalAmountUsd.toFixed(2)}`;
            document.getElementById('pay-total-bs').textContent = `${(activePaymentTotalAmountUsd * exchangeRate).toFixed(2)} Bs`;

            // Reset inputs
            document.getElementById('pay-cash-usd').value = "";
            document.getElementById('pay-zelle-usd').value = "";
            document.getElementById('pay-pagomovil-bs').value = "";
            document.getElementById('pay-punto-bs').value = "";
            document.getElementById('pay-cash-bs').value = "";

            calculatePayment();
            document.getElementById('payment-modal').classList.remove('hidden');
        }

        function quickFillPayment(type) {
            if (activePaymentTotalAmountUsd <= 0) return;
            document.getElementById('pay-cash-usd').value = "";
            document.getElementById('pay-zelle-usd').value = "";
            document.getElementById('pay-pagomovil-bs').value = "";
            document.getElementById('pay-punto-bs').value = "";
            document.getElementById('pay-cash-bs').value = "";

            if (type === 'CASH_USD') {
                document.getElementById('pay-cash-usd').value = activePaymentTotalAmountUsd.toFixed(2);
            } else if (type === 'PAGOMOVIL') {
                document.getElementById('pay-pagomovil-bs').value = (activePaymentTotalAmountUsd * exchangeRate).toFixed(2);
            } else if (type === 'PUNTO') {
                document.getElementById('pay-punto-bs').value = (activePaymentTotalAmountUsd * exchangeRate).toFixed(2);
            }
            calculatePayment();
        }

        function openTableIndividualPayModal(tableNum) {
            const tableOrdersList = orders.filter(o => o.status !== "CANCELLED" && o.paymentStatus !== "PAID" && parseTableNum(o.tableNumber) === tableNum);
            if (tableOrdersList.length === 0) {
                alert("No hay pedidos activos en Mesa " + tableNum);
                return;
            }

            if (tableOrdersList.length === 1) {
                openPaymentModal(tableOrdersList[0].id);
                return;
            }

            let promptMsg = `MESA ${tableNum} tiene ${tableOrdersList.length} pedidos independientes.
`;
            promptMsg += `Ingresa el número de opción para cobrar por separado:

`;
            tableOrdersList.forEach((o, index) => {
                promptMsg += `${index + 1}. Pedido #${o.id} - $${o.totalUsd.toFixed(2)} (${(o.totalUsd * exchangeRate).toFixed(2)} Bs)
`;
            });

            const choiceStr = prompt(promptMsg, "1");
            if (!choiceStr) return;
            const choiceIdx = parseInt(choiceStr, 10) - 1;

            if (choiceIdx >= 0 && choiceIdx < tableOrdersList.length) {
                openPaymentModal(tableOrdersList[choiceIdx].id);
            } else {
                alert("Opción no válida.");
            }
        }

        function closePaymentModal() {
            document.getElementById('payment-modal').classList.add('hidden');
            activePaymentOrderId = null;
            activePaymentOrdersList = [];
            activePaymentTotalAmountUsd = 0;
        }

        function calculatePayment() {
            if (activePaymentOrdersList.length === 0) return;

            const totalUsdToPay = activePaymentTotalAmountUsd;

            // Read inputs
            const cashUsd = parseFloat(document.getElementById('pay-cash-usd').value) || 0;
            const zelleUsd = parseFloat(document.getElementById('pay-zelle-usd').value) || 0;
            const pagomovilBs = parseFloat(document.getElementById('pay-pagomovil-bs').value) || 0;
            const puntoBs = parseFloat(document.getElementById('pay-punto-bs').value) || 0;
            const cashBs = parseFloat(document.getElementById('pay-cash-bs').value) || 0;

            // Convert Bs to USD equivalents
            const pagomovilUsd = pagomovilBs / exchangeRate;
            const puntoUsd = puntoBs / exchangeRate;
            const cashBsUsd = cashBs / exchangeRate;

            // Update equivalent labels
            document.getElementById('pay-pagomovil-usd').textContent = `Equiv. $${pagomovilUsd.toFixed(2)}`;
            document.getElementById('pay-punto-usd').textContent = `Equiv. $${puntoUsd.toFixed(2)}`;
            document.getElementById('pay-cashbs-usd').textContent = `Equiv. $${cashBsUsd.toFixed(2)}`;

            // Total entered in USD
            const totalEnteredUsd = cashUsd + zelleUsd + pagomovilUsd + puntoUsd + cashBsUsd;
            const totalEnteredBs = totalEnteredUsd * exchangeRate;

            document.getElementById('pay-entered-summary').textContent = `$${totalEnteredUsd.toFixed(2)} / ${totalEnteredBs.toFixed(2)} Bs`;

            const statusRow = document.getElementById('pay-status-row');
            const statusLabel = document.getElementById('pay-status-label');
            const statusVal = document.getElementById('pay-status-val');
            const confirmBtn = document.getElementById('btn-confirm-payment');

            const diff = totalEnteredUsd - totalUsdToPay;

            if (diff < -0.01) {
                // Pendiente (Falta dinero)
                const remainingUsd = totalUsdToPay - totalEnteredUsd;
                const remainingBs = remainingUsd * exchangeRate;

                statusLabel.textContent = "Pendiente:";
                statusVal.textContent = `$${remainingUsd.toFixed(2)} / ${remainingBs.toFixed(2)} Bs`;

                statusRow.className = "flex justify-between text-sm font-black text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-2xl";
                confirmBtn.disabled = true;
            } else {
                // Cubierto (Pago completo o con cambio)
                statusRow.className = "flex justify-between text-sm font-black text-emerald-600 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl";
                confirmBtn.disabled = false;

                if (diff > 0.01) {
                    const changeUsd = diff;
                    const changeBs = changeUsd * exchangeRate;
                    statusLabel.textContent = "Cambio / Vuelto:";
                    statusVal.textContent = `$${changeUsd.toFixed(2)} / ${changeBs.toFixed(2)} Bs`;
                } else {
                    statusLabel.textContent = "Estado:";
                    statusVal.textContent = "Pago Exacto Completado";
                }
            }
        }

        function confirmPaymentSubmit() {
            if (activePaymentOrdersList.length === 0) return;

            const cashUsd = parseFloat(document.getElementById('pay-cash-usd').value) || 0;
            const zelleUsd = parseFloat(document.getElementById('pay-zelle-usd').value) || 0;
            const pagomovilBs = parseFloat(document.getElementById('pay-pagomovil-bs').value) || 0;
            const puntoBs = parseFloat(document.getElementById('pay-punto-bs').value) || 0;
            const cashBs = parseFloat(document.getElementById('pay-cash-bs').value) || 0;

            const pagomovilUsd = pagomovilBs / exchangeRate;
            const puntoUsd = puntoBs / exchangeRate;
            const cashBsUsd = cashBs / exchangeRate;

            let parts = [];
            if (cashUsd > 0) parts.push(`Efectivo $: $${cashUsd.toFixed(2)}`);
            if (zelleUsd > 0) parts.push(`Zelle: $${zelleUsd.toFixed(2)}`);
            if (pagomovilBs > 0) parts.push(`Pago Móvil: $${pagomovilUsd.toFixed(2)}`);
            if (puntoBs > 0) parts.push(`Punto de Venta: $${puntoUsd.toFixed(2)}`);
            if (cashBs > 0) parts.push(`Efectivo Bs: $${cashBsUsd.toFixed(2)}`);

            let finalMethodString = parts.join(", ");
            if (finalMethodString === "") {
                finalMethodString = activePaymentOrdersList[0].paymentMethod || "EFECTIVO";
            }

            const amountCollected = activePaymentTotalAmountUsd;
            const orderIds = activePaymentOrdersList.map(o => o.id);

            fetch('/api/admin/collect-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: orderIds,
                    paymentMethod: finalMethodString,
                    newStatus: "DELIVERED"
                })
            })
            .then(res => {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(data => {
                if (data && data.status === 'success') {
                    closePaymentModal();
                    fetchUpdates();
                    showToast(`✅ ¡Cobro de $${amountCollected.toFixed(2)} registrado exitosamente!`, false);
                } else {
                    alert("Error al registrar pago: " + (data ? data.message : "Desconocido"));
                }
            })
            .catch(err => {
                console.error("Error al cobrar pago:", err);
                alert("Detalle de comunicación: el pago fue procesado o verifique red (" + err.message + ")");
            });
        }

        // BUSINESS INTELLIGENCE - RESUMEN DE VENTAS
        function getSalesBreakdown(order) {
            let breakdown = {
                cashUsd: 0,
                zelle: 0,
                pagomovil: 0,
                punto: 0,
                cashBs: 0
            };

            const method = String(order.paymentMethod || "").trim();
            const total = parseFloat(order.totalUsd) || 0;

            if (method.includes(":")) {
                const parts = method.split(",");
                parts.forEach(part => {
                    const cleanPart = part.trim();
                    if (cleanPart.includes(":")) {
                        const subParts = cleanPart.split(":");
                        const name = subParts[0].trim().toUpperCase();
                        const amountValStr = subParts[1].trim().replace("$", "").replace("Bs", "").trim();
                        const amount = parseFloat(amountValStr) || 0;

                        if (name.includes("EFECTIVO $") || name.includes("CASH $")) {
                            breakdown.cashUsd += amount;
                        } else if (name.includes("ZELLE")) {
                            breakdown.zelle += amount;
                        } else if (name.includes("PAGO MÓVIL") || name.includes("PAGO MOVIL") || name.includes("PAGOMOVIL")) {
                            breakdown.pagomovil += amount;
                        } else if (name.includes("PUNTO")) {
                            breakdown.punto += amount;
                        } else if (name.includes("EFECTIVO BS") || name.includes("CASH BS")) {
                            breakdown.cashBs += amount;
                        }
                    }
                });
            } else {
                const mUpper = method.toUpperCase();
                if (mUpper.includes("PAGO_MOVIL") || mUpper.includes("PAGOMOVIL") || mUpper.includes("PAGO MOVIL")) {
                    breakdown.pagomovil = total;
                } else if (mUpper.includes("PUNTO")) {
                    breakdown.punto = total;
                } else if (mUpper.includes("ZELLE")) {
                    breakdown.zelle = total;
                } else if (mUpper.includes("CASH_BS") || mUpper.includes("EFECTIVO BS") || mUpper.includes("EFECTIVO_BS")) {
                    breakdown.cashBs = total;
                } else {
                    breakdown.cashUsd = total;
                }
            }
            return breakdown;
        }

        function renderVentas() {
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID' && o.status === 'DELIVERED' && !o.archived);
            
            let totalSalesUsd = 0;
            let totalSalesBs = 0;
            let transactionCount = paidOrders.length;

            let methodTotals = {
                cashUsd: 0,
                zelle: 0,
                pagomovil: 0,
                punto: 0,
                cashBs: 0
            };

            paidOrders.forEach(o => {
                totalSalesUsd += o.totalUsd;
                totalSalesBs += o.totalUsd * exchangeRate;

                const breakdown = getSalesBreakdown(o);
                methodTotals.cashUsd += breakdown.cashUsd;
                methodTotals.zelle += breakdown.zelle;
                methodTotals.pagomovil += breakdown.pagomovil;
                methodTotals.punto += breakdown.punto;
                methodTotals.cashBs += breakdown.cashBs;
            });

            // Actualizar KPIs
            document.getElementById('kpi-total-usd').textContent = `$${totalSalesUsd.toFixed(2)}`;
            document.getElementById('kpi-total-bs').textContent = `${totalSalesBs.toFixed(2)} Bs`;
            document.getElementById('kpi-exchange-rate').textContent = `Calculado a tasa: ${exchangeRate.toFixed(2)} Bs/$`;
            document.getElementById('kpi-trans-count').textContent = transactionCount;

            // Render progress bars por método
            const totalCollected = methodTotals.cashUsd + methodTotals.zelle + methodTotals.pagomovil + methodTotals.punto + methodTotals.cashBs || 1;
            
            const methodMetadata = [
                { key: 'cashUsd', label: 'Efectivo $', color: 'bg-green-500', text: 'text-green-500' },
                { key: 'zelle', label: 'Zelle', color: 'bg-blue-500', text: 'text-blue-500' },
                { key: 'pagomovil', label: 'Pago Móvil (Bs)', color: 'bg-purple-500', text: 'text-purple-500' },
                { key: 'punto', label: 'Punto de Venta (Bs)', color: 'bg-indigo-500', text: 'text-indigo-500' },
                { key: 'cashBs', label: 'Efectivo Bs', color: 'bg-amber-500', text: 'text-amber-500' }
            ];

            const methodsContainer = document.getElementById('sales-by-method-container');
            methodsContainer.innerHTML = "";

            methodMetadata.forEach(m => {
                const amount = methodTotals[m.key];
                const pct = ((amount / totalCollected) * 100).toFixed(1);

                methodsContainer.innerHTML += `
                    <div class="space-y-1">
                        <div class="flex justify-between text-xs font-bold text-slate-700">
                            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full ${m.color}"></span> ${m.label}</span>
                            <span>$${amount.toFixed(2)} (${pct}%)</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                            <div class="${m.color} h-full rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                        </div>
                    </div>
                `;
            });

            // Render log de transacciones
            const tbody = document.getElementById('transactions-log-tbody');
            tbody.innerHTML = "";

            if (paidOrders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-8 text-slate-400">No hay ventas registradas aún hoy.</td>
                    </tr>
                `;
                return;
            }

            paidOrders.forEach(o => {
                const cleanPaymentText = o.paymentMethod.includes(":") ? "Mixto: " + o.paymentMethod : o.paymentMethod;
                tbody.innerHTML += `
                    <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
                        <td class="py-3 pr-2 font-black text-slate-900">#${o.id}</td>
                        <td class="py-3 px-2 text-xs text-slate-500">${o.timestamp}</td>
                        <td class="py-3 px-2 text-xs font-bold text-slate-700">${o.orderType === 'TAKEAWAY' ? '🚚 Llevar' : '🍽️ ' + o.tableNumber}</td>
                        <td class="py-3 px-2 text-xs text-slate-600 max-w-xs truncate" title="${o.paymentMethod}">${cleanPaymentText}</td>
                        <td class="py-3 px-2 font-bold text-slate-900 text-right">$${o.totalUsd.toFixed(2)}</td>
                        <td class="py-3 px-2 font-bold text-purple-600 text-right">${(o.totalUsd * exchangeRate).toFixed(2)} Bs</td>
                        <td class="py-3 pl-2 text-right">
                            <button onclick="openAdminTicketModal(${o.id})" class="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs px-2.5 py-1.5 rounded-lg border border-purple-200 transition inline-flex items-center gap-1">
                                <span class="material-icons text-xs">receipt_long</span> Ticket
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        function updateOrderStatus(orderId, status) {
            fetch('/api/admin/update-order-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, status })
            })
            .then(res => {
                if (res.ok) {
                    fetchUpdates();
                }
            });
        }

        function deliverAndCollect(orderId) {
            fetch('/api/admin/update-order-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId, status: 'DELIVERED' })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    fetchUpdates().then(() => {
                        openPaymentModal(orderId);
                    });
                }
            });
        }

        function updateRate() {
            const rate = parseFloat(document.getElementById('input-rate').value);
            if (isNaN(rate) || rate <= 0) return;

            fetch('/api/admin/update-exchange-rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ exchangeRateBs: rate })
            })
            .then(res => {
                if (res.ok) {
                    exchangeRate = rate;
                    fetchUpdates();
                    alert("Tasa del dólar actualizada correctamente.");
                }
            });
        }

        function sincronizarTasaDolarApi(btn) {
            const originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="material-icons text-sm animate-spin block">sync</span>`;
            
            // Intentamos obtener la tasa oficial de DolarApi
            fetch('https://ve.dolarapi.com/v1/dolares/oficial')
            .then(res => {
                if (!res.ok) throw new Error("No se pudo obtener la tasa oficial");
                return res.json();
            })
            .then(data => {
                const rate = parseFloat(data.promedio || data.venta || data.compra);
                if (rate && rate > 0) {
                    document.getElementById('input-rate').value = rate.toFixed(2);
                    
                    fetch('/api/admin/update-exchange-rate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ exchangeRateBs: rate })
                    })
                    .then(r => {
                        if (r.ok) {
                            exchangeRate = rate;
                            fetchUpdates();
                            alert(`📈 Tasa sincronizada con éxito desde DolarApi (BCV): Bs. ${rate.toFixed(2)}`);
                        } else {
                            alert(`Tasa obtenida (Bs. ${rate.toFixed(2)}) pero no se pudo guardar en el servidor.`);
                        }
                    });
                } else {
                    throw new Error("Formato de respuesta inválido");
                }
            })
            .catch(err => {
                console.error("Error sincronizando con DolarApi oficial, intentando fallback:", err);
                // Si la oficial falla, intentamos con la lista general
                fetch('https://ve.dolarapi.com/v1/dolares')
                .then(res => res.json())
                .then(list => {
                    const oficial = list.find(d => d.fuente === 'oficial' || d.fuente === 'bcv' || d.nombre.toLowerCase().includes('oficial') || d.nombre.toLowerCase().includes('bcv'));
                    const rateObj = oficial || list[0];
                    const rate = parseFloat(rateObj.promedio || rateObj.venta || rateObj.compra);
                    if (rate && rate > 0) {
                        document.getElementById('input-rate').value = rate.toFixed(2);
                        fetch('/api/admin/update-exchange-rate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ exchangeRateBs: rate })
                        })
                        .then(r => {
                            if (r.ok) {
                                exchangeRate = rate;
                                fetchUpdates();
                                alert(`📈 Tasa sincronizada con éxito (Fallback): Bs. ${rate.toFixed(2)}`);
                            }
                        });
                    } else {
                        alert("⚠️ No se encontró una tasa de cambio válida.");
                    }
                })
                .catch(err2 => {
                    alert("❌ Error de conexión al sincronizar con DolarApi.\nVerifica tu conexión a internet o ingresa la tasa manualmente.");
                });
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            });
        }

        function toggleProduct(productId) {
            fetch('/api/admin/toggle-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    fetchUpdates();
                }
            });
        }

        function updateStock(productId, stock) {
            const parsedStock = parseInt(stock);
            if (isNaN(parsedStock) || parsedStock < 0) return;

            fetch('/api/admin/update-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, stock: parsedStock })
            })
            .then(res => {
                if (res.ok) {
                    fetchUpdates();
                }
            });
        }

        let uploadedImageBase64 = "";

        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const max_size = 320;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > max_size) {
                            height *= max_size / width;
                            width = max_size;
                        }
                    } else {
                        if (height > max_size) {
                            width *= max_size / height;
                            height = max_size;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.7);
                    
                    // Show preview
                    document.getElementById('preview-icon').classList.add('hidden');
                    const previewImg = document.getElementById('preview-img');
                    previewImg.src = uploadedImageBase64;
                    previewImg.classList.remove('hidden');
                    document.getElementById('btn-clear-image').classList.remove('hidden');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function clearCustomImage() {
            uploadedImageBase64 = "";
            document.getElementById('form-image-file').value = "";
            document.getElementById('preview-img').src = "";
            document.getElementById('preview-img').classList.add('hidden');
            document.getElementById('preview-icon').classList.remove('hidden');
            document.getElementById('btn-clear-image').classList.add('hidden');
        }

        function openAddProductModal() {
            document.getElementById('modal-title').textContent = "Agregar Producto";
            document.getElementById('form-product-id').value = "";
            document.getElementById('form-product-name').value = "";
            document.getElementById('form-product-desc').value = "";
            document.getElementById('form-product-price').value = "";
            document.getElementById('form-product-stock').value = "10";
            document.getElementById('form-product-image').value = "plato";
            clearCustomImage();
            
            // Llenar categorías
            const catSelect = document.getElementById('form-product-category');
            catSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            
            document.getElementById('product-modal').classList.remove('hidden');
        }

        function openEditProductModal(productId) {
            const p = products.find(prod => prod.id === productId);
            if (!p) return;
            
            document.getElementById('modal-title').textContent = "Editar Producto";
            document.getElementById('form-product-id').value = p.id;
            document.getElementById('form-product-name').value = p.name;
            document.getElementById('form-product-desc').value = p.description || "";
            document.getElementById('form-product-price').value = p.priceUsd;
            document.getElementById('form-product-stock').value = p.stock;
            
            clearCustomImage();
            
            if (p.imageUri && p.imageUri.startsWith('data:image')) {
                uploadedImageBase64 = p.imageUri;
                document.getElementById('preview-icon').classList.add('hidden');
                const previewImg = document.getElementById('preview-img');
                previewImg.src = uploadedImageBase64;
                previewImg.classList.remove('hidden');
                document.getElementById('btn-clear-image').classList.remove('hidden');
                document.getElementById('form-product-image').value = "plato";
            } else {
                document.getElementById('form-product-image').value = p.imageUri || "plato";
            }
            
            // Llenar categorías
            const catSelect = document.getElementById('form-product-category');
            catSelect.innerHTML = categories.map(c => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${c.name}</option>`).join('');
            
            document.getElementById('product-modal').classList.remove('hidden');
        }

        function closeProductModal() {
            document.getElementById('product-modal').classList.add('hidden');
        }

        function saveProduct(event) {
            event.preventDefault();
            const id = document.getElementById('form-product-id').value;
            const name = document.getElementById('form-product-name').value;
            const desc = document.getElementById('form-product-desc').value;
            const price = parseFloat(document.getElementById('form-product-price').value);
            const stock = parseInt(document.getElementById('form-product-stock').value);
            const categoryId = parseInt(document.getElementById('form-product-category').value);
            
            const imageUri = uploadedImageBase64 !== "" ? uploadedImageBase64 : document.getElementById('form-product-image').value;
            
            const isEdit = id !== "";
            const url = isEdit ? '/api/admin/edit-product' : '/api/admin/add-product';
            const payload = {
                name: name,
                description: desc,
                priceUsd: price,
                stock: stock,
                categoryId: categoryId,
                imageUri: imageUri
            };
            if (isEdit) {
                payload.productId = parseInt(id);
            }
            
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    closeProductModal();
                    fetchUpdates();
                } else {
                    alert("Error: " + (data.message || "No se pudo guardar el producto."));
                }
            })
            .catch(err => {
                console.error("Error al guardar producto:", err);
                alert("Ocurrió un error al intentar guardar el producto.");
            });
        }

        function deleteProduct(productId) {
            const p = products.find(prod => prod.id === productId);
            if (!p) return;
            if (!confirm(`¿Está seguro de que desea eliminar el producto "${p.name}"?`)) return;
            
            fetch('/api/admin/delete-product', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId: productId })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    fetchUpdates();
                } else {
                    alert("Error al eliminar el producto.");
                }
            });
        }

        function fetchUpdates() {
            // Buscar pedidos
            const p1 = fetch('/api/orders')
            .then(res => res.json())
            .then(newOrders => {
                // Detectar nuevos pedidos en cocina (status CONFIRMED o PREPARING)
                let currentPreparingIds = new Set();
                let hasNewKitchenOrder = false;

                newOrders.forEach(o => {
                    if (o.status === "CONFIRMED" || o.status === "PREPARING") {
                        currentPreparingIds.add(o.id);
                        if (!knownPreparingOrderIds.has(o.id)) {
                            hasNewKitchenOrder = true;
                        }
                    }
                });

                if (hasNewKitchenOrder && knownPreparingOrderIds.size > 0) {
                    playKitchenAlert();
                }
                knownPreparingOrderIds = currentPreparingIds;

                orders = newOrders;
                renderOrders();
                renderTableStatus();
                renderPaymentReferences();
                if (currentTab === 'ventas') {
                    renderVentas();
                }
                document.getElementById('last-update').textContent = "Actualizado: " + new Date().toLocaleTimeString();
            });

            // Buscar productos
            const p2 = fetch('/api/products')
            .then(res => res.json())
            .then(newProds => {
                products = newProds;
                renderProducts();
            });

            // Buscar categorías
            const p3 = fetch('/api/categories')
            .then(res => res.json())
            .then(newCats => {
                categories = newCats;
                renderCategories();
                updateCategoryDropdowns();
            });

            // Buscar estados de mesas
            const p4 = fetch('/api/table-states')
            .then(res => res.json())
            .then(states => {
                tableStates = states || {};
            })
            .catch(e => console.error("Error obteniendo tableStates:", e));

            return Promise.all([p1, p2, p3, p4]);
        }

        // ==========================================
        // GESTIÓN Y RENDERIZADO DE TICKETS BRUTALES
        // ==========================================
        let currentTicketOrderId = null;

        function updateLiveTicketPreview() {
            const name = (document.getElementById('cfg-restaurant-name')?.value || "GastroLocal Criollo").trim();
            const slogan = (document.getElementById('cfg-restaurant-slogan')?.value || "").trim();
            const logo = (document.getElementById('cfg-restaurant-logo')?.value || "").trim();
            const rif = (document.getElementById('cfg-restaurant-rif')?.value || "J-00000000-0").trim();
            const address = (document.getElementById('cfg-restaurant-address')?.value || "").trim();
            const phone = (document.getElementById('cfg-restaurant-phone')?.value || "").trim();
            const instagram = (document.getElementById('cfg-restaurant-instagram')?.value || "").trim();
            const footer = (document.getElementById('cfg-ticket-footer')?.value || "¡Gracias por preferirnos!").trim();

            const simName = document.getElementById('sim-name');
            if (simName) simName.textContent = name;
            
            const simSlogan = document.getElementById('sim-slogan');
            if (simSlogan) simSlogan.textContent = slogan;

            const simRif = document.getElementById('sim-rif');
            if (simRif) simRif.textContent = rif;

            const simAddress = document.getElementById('sim-address');
            if (simAddress) simAddress.textContent = address;

            const simPhone = document.getElementById('sim-phone');
            if (simPhone) simPhone.textContent = phone;

            const simInstagram = document.getElementById('sim-instagram');
            if (simInstagram) simInstagram.textContent = instagram;

            const simFooter = document.getElementById('sim-footer');
            if (simFooter) simFooter.innerHTML = footer.split(String.fromCharCode(10)).join('<br>');

            const logoWrapper = document.getElementById('sim-logo-wrapper');
            const simLogo = document.getElementById('sim-logo');
            if (logoWrapper && simLogo) {
                if (logo) {
                    simLogo.src = logo;
                    logoWrapper.classList.remove('hidden');
                } else {
                    logoWrapper.classList.add('hidden');
                }
            }
        }

        function openAdminTicketModal(orderId) {
            currentTicketOrderId = orderId;
            const order = orders.find(o => o.id === orderId);
            if (!order) {
                alert("Pedido no encontrado");
                return;
            }

            const titleEl = document.getElementById('ticket-modal-title');
            if (titleEl) titleEl.textContent = `Ticket de Pago #${order.id}`;

            const wrapper = document.getElementById('admin-ticket-content-wrapper');
            if (!wrapper) return;

            const name = (document.getElementById('cfg-restaurant-name')?.value || "GastroLocal").trim();
            const slogan = (document.getElementById('cfg-restaurant-slogan')?.value || "").trim();
            const logo = (document.getElementById('cfg-restaurant-logo')?.value || "").trim();
            const rif = (document.getElementById('cfg-restaurant-rif')?.value || "").trim();
            const address = (document.getElementById('cfg-restaurant-address')?.value || "").trim();
            const phone = (document.getElementById('cfg-restaurant-phone')?.value || "").trim();
            const instagram = (document.getElementById('cfg-restaurant-instagram')?.value || "").trim();
            const footer = (document.getElementById('cfg-ticket-footer')?.value || "").trim();

            const totalBs = (order.totalUsd * exchangeRate).toFixed(2);
            const isPaid = order.paymentStatus === 'PAID';
            const orderTypeLabel = order.orderType === 'TAKEAWAY' ? '🚚 PARA LLEVAR' : `🍽️ MESA ${order.tableNumber}`;

            const itemsRows = order.items.map(it => {
                const itTotalUsd = (it.priceUsd * it.quantity).toFixed(2);
                const itTotalBs = (it.priceUsd * it.quantity * exchangeRate).toFixed(2);
                return `
                    <tr>
                        <td class="py-1.5 pr-1 font-mono font-bold text-slate-900">${it.quantity}x</td>
                        <td class="py-1.5 pr-1">
                            <div class="font-bold text-slate-900 leading-tight">${it.productName}</div>
                            <div class="text-[9px] text-slate-500 font-mono">$${it.priceUsd.toFixed(2)} c/u</div>
                        </td>
                        <td class="py-1.5 text-right font-mono font-bold whitespace-nowrap">
                            <div>$${itTotalUsd}</div>
                            <div class="text-[9px] text-purple-700 font-medium">${itTotalBs} Bs</div>
                        </td>
                    </tr>
                `;
            }).join('');

            const qrData = encodeURIComponent(`${window.location.origin}/ticket?id=${order.id}`);

            wrapper.innerHTML = `
                <div class="text-center space-y-1">
                    ${logo ? `<div class="mb-2 flex justify-center"><img src="${logo}" alt="Logo" class="max-h-12 max-w-[140px] object-contain rounded-md"></div>` : ''}
                    <h4 class="text-lg font-black uppercase tracking-tight text-slate-950 leading-tight">${name}</h4>
                    ${slogan ? `<p class="text-[11px] font-semibold text-slate-600 italic">${slogan}</p>` : ''}
                    <div class="text-[10px] text-slate-600 space-y-0.5 pt-1 border-t border-dashed border-slate-200 mt-1">
                        ${rif ? `<div>RIF: <span class="font-mono font-bold">${rif}</span></div>` : ''}
                        ${address ? `<div class="leading-tight">${address}</div>` : ''}
                        ${phone || instagram ? `<div>${phone ? `Tel: <span>${phone}</span>` : ''} ${phone && instagram ? '&bull;' : ''} ${instagram ? `<span>${instagram}</span>` : ''}</div>` : ''}
                    </div>
                </div>

                <div class="border-t-2 border-dashed border-slate-800 my-1"></div>

                <div class="space-y-0.5 text-[11px]">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-500 uppercase text-[9px]">COMPROBANTE DE PAGO</span>
                        <span class="font-mono font-black text-slate-900">#${String(order.id).padStart(5, '0')}</span>
                    </div>
                    <div class="flex justify-between text-slate-700">
                        <span>Fecha y Hora:</span>
                        <span class="font-mono">${order.timestamp || ''}</span>
                    </div>
                    <div class="flex justify-between text-slate-700">
                        <span>Servicio:</span>
                        <span class="font-bold text-purple-900">${orderTypeLabel}</span>
                    </div>
                    <div class="flex justify-between items-center pt-1">
                        <span class="text-slate-600 font-bold">Estado:</span>
                        <span class="px-2 py-0.5 ${isPaid ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-amber-100 text-amber-900 border-amber-300'} border rounded-full font-black text-[9px] uppercase">
                            ${isPaid ? '✓ PAGADO' : '⏳ PENDIENTE'}
                        </span>
                    </div>
                </div>

                <div class="border-t border-dashed border-slate-300 pt-1.5">
                    <table class="w-full text-left text-[11px]">
                        <thead>
                            <tr class="border-b-2 border-slate-800 font-black text-[10px] uppercase">
                                <th class="pb-1 pr-1">Cant</th>
                                <th class="pb-1 pr-1">Descripción</th>
                                <th class="pb-1 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-dashed divide-slate-200">
                            ${itemsRows}
                        </tbody>
                    </table>
                </div>

                <div class="space-y-1 pt-1.5 border-t-2 border-slate-800 font-mono text-[11px]">
                    <div class="flex justify-between text-slate-700">
                        <span>SUBTOTAL USD:</span>
                        <span class="font-bold">$${order.totalUsd.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-slate-500 text-[10px]">
                        <span>Tasa Oficial BCV:</span>
                        <span class="font-bold">${exchangeRate.toFixed(2)} Bs/$</span>
                    </div>
                    <div class="flex justify-between text-purple-900 font-bold">
                        <span>SUBTOTAL EN BS:</span>
                        <span>${totalBs} Bs</span>
                    </div>
                    
                    <div class="p-2.5 bg-slate-950 text-white rounded-xl mt-1 space-y-0.5">
                        <div class="flex justify-between items-center">
                            <span class="text-[10px] font-bold text-slate-300">TOTAL ${isPaid ? 'PAGADO' : 'A PAGAR'}:</span>
                            <span class="text-base font-black text-emerald-400">$${order.totalUsd.toFixed(2)} USD</span>
                        </div>
                        <div class="flex justify-between items-center border-t border-slate-800 pt-0.5">
                            <span class="text-[9px] font-bold text-slate-400">EN BOLÍVARES:</span>
                            <span class="text-xs font-black text-purple-300">${totalBs} Bs</span>
                        </div>
                    </div>
                </div>

                <div class="pt-1.5 border-t border-dashed border-slate-300 text-[11px] space-y-1">
                    <div class="flex justify-between items-center">
                        <span class="text-slate-600 font-bold">Forma de Pago:</span>
                        <span class="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">${order.paymentMethod || 'EFECTIVO'}</span>
                    </div>
                    ${order.paymentReference ? `<div class="text-[10px] text-purple-900 bg-purple-50 p-1.5 rounded font-mono">Ref / Transacción: #${order.paymentReference}</div>` : ''}
                </div>

                <div class="pt-2 border-t border-dashed border-slate-300 text-center space-y-1">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=2&data=${qrData}" alt="QR" class="w-16 h-16 mx-auto border border-slate-900 rounded-lg p-0.5 bg-white">
                    <p class="text-[9px] text-slate-500 font-mono">Escanea para consultar o validar este ticket digital</p>
                </div>

                <div class="pt-1.5 border-t-2 border-slate-800 text-center">
                    <p class="text-[10px] font-bold text-slate-900 italic leading-snug">
                        ${footer.split(String.fromCharCode(10)).join('<br>')}
                    </p>
                    <p class="text-[8px] text-slate-400 font-mono mt-1">
                        Comprobante Digital emitido por GastroLocal POS
                    </p>
                </div>
            `;

            document.getElementById('ticket-modal').classList.remove('hidden');
        }

        function closeTicketModal() {
            document.getElementById('ticket-modal').classList.add('hidden');
        }

        function downloadAdminTicketPDF() {
            const el = document.getElementById('admin-ticket-content-wrapper');
            if (!el) return;
            const opt = {
                margin: [4, 4, 4, 4],
                filename: `Ticket_GastroLocal_${currentTicketOrderId || '001'}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 3, useCORS: true },
                jsPDF: { unit: 'mm', format: [80, 220], orientation: 'portrait' }
            };
            html2pdf().set(opt).from(el).save();
        }

        function printAdminTicket() {
            if (!currentTicketOrderId) return;
            window.open(`/ticket?id=${currentTicketOrderId}`, '_blank');
        }

        function shareAdminTicketWhatsApp() {
            if (!currentTicketOrderId) return;
            const order = orders.find(o => o.id === currentTicketOrderId);
            if (!order) return;
            const ticketUrl = `${window.location.origin}/ticket?id=${order.id}`;
            const restaurantTitle = document.getElementById('cfg-restaurant-name')?.value || 'GastroLocal';
            const msg = `🧾 *¡Hola! Aquí tienes el Comprobante Digital de tu consumo en ${restaurantTitle}*:

*Pedido:* #${order.id}
*Total:* $${order.totalUsd.toFixed(2)} (${(order.totalUsd * exchangeRate).toFixed(2)} Bs)

Puedes ver o descargar tu ticket en PDF haciendo clic aquí:
${ticketUrl}

¡Muchas gracias por su preferencia! ✨`;
            const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank');
        }

        function openTicketInNewTab() {
            if (!currentTicketOrderId) return;
            window.open(`/ticket?id=${currentTicketOrderId}`, '_blank');
        }

        function downloadLivePreviewPDF() {
            const el = document.getElementById('live-ticket-preview-container');
            if (!el) return;
            const opt = {
                margin: [4, 4, 4, 4],
                filename: `Muestra_Ticket_${(document.getElementById('cfg-restaurant-name')?.value || 'GastroLocal').replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 3, useCORS: true },
                jsPDF: { unit: 'mm', format: [80, 220], orientation: 'portrait' }
            };
            html2pdf().set(opt).from(el).save();
        }

        function printLivePreviewTicket() {
            const el = document.getElementById('live-ticket-preview-container');
            if (!el) return;
            const printWin = window.open('', '', 'width=450,height=700');
            printWin.document.write(
                '<html><head><title>Ticket Muestra</title>' +
                '<' + 'script src="https://cdn.tailwindcss.com"><' + '/script>' +
                '<style>@page { size: 80mm auto; margin: 2mm; }</style>' +
                '</head><body class="p-3 bg-white text-slate-900" onload="window.print(); window.close();">' +
                el.outerHTML +
                '</body></html>'
            );
            printWin.document.close();
        }
            // ==========================================
        // GESTIÓN DE MODIFICADORES EN FORMULARIO ADMIN
        // ==========================================
        function addFormModifierRow(name = "", priceUsd = 0.0) {
            const container = document.getElementById('form-modifiers-container');
            if (!container) return;
            const row = document.createElement('div');
            row.className = "flex items-center gap-2 bg-white p-2 rounded-xl border border-purple-200 shadow-sm modifier-form-row";
            row.innerHTML = `
                <input type="text" placeholder="Nombre (ej: Queso Extra)" value="${name}" class="mod-name flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-600">
                <div class="flex items-center gap-1 w-24">
                    <span class="text-xs text-slate-500 font-bold">$</span>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value="${priceUsd}" class="mod-price w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600">
                </div>
                <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 p-1">
                    <span class="material-icons text-sm">delete</span>
                </button>
            `;
            container.appendChild(row);
        }

        function getFormModifiers() {
            const rows = document.querySelectorAll('.modifier-form-row');
            const result = [];
            rows.forEach(r => {
                const nameInput = r.querySelector('.mod-name');
                const priceInput = r.querySelector('.mod-price');
                if (nameInput && nameInput.value.trim()) {
                    result.push({
                        name: nameInput.value.trim(),
                        priceUsd: parseFloat(priceInput.value || 0)
                    });
                }
            });
            return result;
        }

        // ==========================================
        // ANALÍTICA, GRÁFICOS Y EXPORTACIÓN A EXCEL
        // ==========================================
        function renderReports() {
            const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
            const totalUsd = paidOrders.reduce((sum, o) => sum + (o.totalUsd || 0), 0);
            const totalBs = totalUsd * exchangeRate;
            const avgTicket = paidOrders.length > 0 ? (totalUsd / paidOrders.length) : 0;

            document.getElementById('rep-kpi-total-usd').textContent = `$${totalUsd.toFixed(2)}`;
            document.getElementById('rep-kpi-total-bs').textContent = `${totalBs.toFixed(2)} Bs`;
            document.getElementById('rep-kpi-avg-ticket').textContent = `$${avgTicket.toFixed(2)}`;
            document.getElementById('rep-kpi-orders-count').textContent = paidOrders.length;

            // Calcular ventas por producto
            const prodCounts = {};
            const prodRevenue = {};
            paidOrders.forEach(o => {
                (o.items || []).forEach(it => {
                    const name = it.productName || 'Producto';
                    prodCounts[name] = (prodCounts[name] || 0) + it.quantity;
                    prodRevenue[name] = (prodRevenue[name] || 0) + (it.unitTotalUsd || it.priceUsd || 0) * it.quantity;
                });
            });

            // Top Producto
            let topName = "Sin ventas aún";
            let topQty = 0;
            for (const name in prodCounts) {
                if (prodCounts[name] > topQty) {
                    topQty = prodCounts[name];
                    topName = name;
                }
            }
            document.getElementById('rep-kpi-top-product').textContent = topName;
            document.getElementById('rep-kpi-top-qty').textContent = `${topQty} unidades vendidas`;

            // Gráfico 1: Ventas por Hora (08:00 a 23:00)
            const hourTotals = new Array(24).fill(0);
            paidOrders.forEach(o => {
                if (o.timestamp) {
                    // Extraer hora si es formato "YYYY-MM-DD HH:MM PM" o similar
                    let hour = 12;
                    if (o.timestamp.includes(':')) {
                        const parts = o.timestamp.split(' ');
                        const timePart = parts[1] || '';
                        let h = parseInt(timePart.split(':')[0] || '12');
                        const isPm = o.timestamp.toUpperCase().includes('PM');
                        const isAm = o.timestamp.toUpperCase().includes('AM');
                        if (isPm && h < 12) h += 12;
                        if (isAm && h === 12) h = 0;
                        hour = Math.min(23, Math.max(0, h));
                    }
                    hourTotals[hour] += (o.totalUsd || 0);
                }
            });

            const relevantHours = [8, 10, 12, 14, 16, 18, 20, 22];
            const maxHourVal = Math.max(...hourTotals.slice(8, 23), 10);
            const chartHourly = document.getElementById('chart-hourly-sales');
            chartHourly.innerHTML = "";

            for (let h = 8; h <= 22; h++) {
                const val = hourTotals[h];
                const pct = Math.min(100, Math.max(8, (val / maxHourVal) * 100));
                const bar = document.createElement('div');
                bar.className = "flex-1 flex flex-col items-center gap-1 group relative h-full justify-end";
                bar.innerHTML = `
                    <div class="text-[9px] font-mono text-purple-700 font-bold opacity-0 group-hover:opacity-100 transition absolute -top-5">$${val.toFixed(0)}</div>
                    <div class="w-full bg-gradient-to-t from-purple-700 to-indigo-500 rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm" style="height: ${pct}%;"></div>
                    <span class="text-[9px] text-slate-400 font-mono">${h}h</span>
                `;
                chartHourly.appendChild(bar);
            }

            // Gráfico 2: Top 5 Platos
            const sortedProds = Object.keys(prodCounts).sort((a, b) => prodCounts[b] - prodCounts[a]).slice(0, 5);
            const topProductsCont = document.getElementById('chart-top-products');
            topProductsCont.innerHTML = "";

            if (sortedProds.length === 0) {
                topProductsCont.innerHTML = '<div class="text-center py-6 text-slate-400 text-xs">No hay ventas registradas aún.</div>';
            } else {
                const maxProdQty = prodCounts[sortedProds[0]] || 1;
                sortedProds.forEach(name => {
                    const qty = prodCounts[name];
                    const rev = prodRevenue[name] || 0;
                    const pct = Math.min(100, Math.max(15, (qty / maxProdQty) * 100));
                    const row = document.createElement('div');
                    row.className = "space-y-1";
                    row.innerHTML = `
                        <div class="flex justify-between text-xs">
                            <span class="font-bold text-slate-800">${name}</span>
                            <span class="font-mono text-slate-600 font-bold">${qty} uds • <strong class="text-purple-700">$${rev.toFixed(2)}</strong></span>
                        </div>
                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-purple-600 to-indigo-500 h-full rounded-full transition-all duration-500" style="width: ${pct}%;"></div>
                        </div>
                    `;
                    topProductsCont.appendChild(row);
                });
            }

            // Desglose Métodos de Pago
            const methodTotals = { "Efectivo $": 0, "Pago Móvil": 0, "Punto": 0, "Zelle": 0, "Efectivo Bs": 0, "Otros": 0 };
            paidOrders.forEach(o => {
                const m = (o.paymentMethod || '').toUpperCase();
                const t = o.totalUsd || 0;
                if (m.includes('PAGO')) methodTotals["Pago Móvil"] += t;
                else if (m.includes('PUNTO')) methodTotals["Punto"] += t;
                else if (m.includes('ZELLE')) methodTotals["Zelle"] += t;
                else if (m.includes('BS')) methodTotals["Efectivo Bs"] += t;
                else if (m.includes('EFECTIVO') || m.includes('USD')) methodTotals["Efectivo $"] += t;
                else methodTotals["Otros"] += t;
            });

            const methodContainer = document.getElementById('chart-payment-methods');
            methodContainer.innerHTML = Object.entries(methodTotals).map(([method, amt]) => `
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center space-y-0.5">
                    <span class="text-[10px] text-slate-500 font-bold block truncate uppercase">${method}</span>
                    <span class="text-sm font-black text-slate-900 font-mono block">$${amt.toFixed(2)}</span>
                    <span class="text-[10px] text-purple-700 font-bold font-mono block">${(amt * exchangeRate).toFixed(2)} Bs</span>
                </div>
            `).join("");
        }

        // ==========================================
        // EXPORTACIÓN DE DATOS A EXCEL (.CSV UTF-8 BOM)
        // ==========================================
        function exportSalesToExcelCSV() {
            if (orders.length === 0) {
                alert("No hay ventas para exportar.");
                return;
            }

            let csv = "﻿"; // UTF-8 Byte Order Mark para compatibilidad perfecta con Microsoft Excel
            csv += `ID Pedido;Fecha y Hora;Mesa;Mozo;Productos y Extras;Metodo de Pago;Estado Pago;Total USD;Total Bs
`;

            orders.forEach(o => {
                const id = o.id || "";
                const fecha = (o.timestamp || "").replace(/;/g, ',');
                const mesa = (o.tableNumber || "").replace(/;/g, ',');
                const mozo = (o.waiterName || "N/A").replace(/;/g, ',');
                
                const itemsStr = (o.items || []).map(it => {
                    let text = `${it.quantity}x ${it.productName}`;
                    if (it.selectedModifiers && it.selectedModifiers.length > 0) {
                        text += " (" + it.selectedModifiers.map(m => m.name).join(', ') + ")";
                    }
                    return text;
                }).join(" + ").replace(/;/g, ',');

                const metodo = (o.paymentMethod || "").replace(/;/g, ',');
                const estado = o.paymentStatus === 'PAID' ? 'PAGADO' : 'PENDIENTE';
                const totalUsd = (o.totalUsd || 0).toFixed(2);
                const totalBs = ((o.totalUsd || 0) * exchangeRate).toFixed(2);

                csv += `${id};${fecha};${mesa};${mozo};"${itemsStr}";${metodo};${estado};${totalUsd};${totalBs}
`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Ventas_GastroLocal_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        function exportInventoryToExcelCSV() {
            if (products.length === 0) {
                alert("No hay productos en inventario para exportar.");
                return;
            }

            let csv = "﻿";
            csv += `ID;Nombre Producto;Categoria;Estacion;Precio USD;Precio Bs;Stock Actual;Modificadores / Extras;Estado
`;

            products.forEach(p => {
                const id = p.id;
                const name = (p.name || "").replace(/;/g, ',');
                const cat = categories.find(c => c.id === p.categoryId);
                const catName = cat ? cat.name.replace(/;/g, ',') : "General";
                const station = cat ? (cat.station || "kitchen").toUpperCase() : "KITCHEN";
                const priceUsd = (p.priceUsd || 0).toFixed(2);
                const priceBs = ((p.priceUsd || 0) * exchangeRate).toFixed(2);
                const stock = p.stock || 0;
                
                const modsStr = (p.modifiers || []).map(m => `${m.name} (+$${m.priceUsd})`).join(', ').replace(/;/g, ',');
                const estado = p.isAvailable ? "DISPONIBLE" : "NO DISPONIBLE";

                csv += `${id};"${name}";${catName};${station};${priceUsd};${priceBs};${stock};"${modsStr}";${estado}
`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Inventario_GastroLocal_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    