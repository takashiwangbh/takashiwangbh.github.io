$(function(){
    // ========================================
    // LOADING
    // ========================================
    var referrer = document.referrer;
    var host = location.host;
    if (referrer.indexOf(host) == -1){
        $(window).load(function(){
            $('body').addClass('start');
        });
    } else {
        $('body').addClass('already');
    }

    // ========================================
    // SMOOTH SCROLL HEADER EFFECT
    // ========================================
    let lastScrollY = 0;
    let ticking = false;

    function updateHeader() {
        if (window.scrollY > 50) {
            $('body').addClass('down');
        } else {
            $('body').removeClass('down');
        }
        ticking = false;
    }

    $(window).on('scroll', function() {
        lastScrollY = window.scrollY;
        if (!ticking) {
            window.requestAnimationFrame(updateHeader);
            ticking = true;
        }
    });

    // ========================================
    // INTERSECTION OBSERVER FOR ANIMATIONS
    // ========================================
    
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
        // News items animation
        const newsItems = document.querySelectorAll('.list--information li');
        const newsObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const delay = Array.from(newsItems).indexOf(entry.target) * 100;
                    setTimeout(() => {
                        entry.target.classList.add('news-visible');
                        entry.target.classList.remove('news-hidden');
                    }, delay);
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -20px 0px'
        });

        newsItems.forEach(item => {
            item.classList.add('news-hidden');
            newsObserver.observe(item);
        });
    }

    // ========================================
    // HERO PARALLAX (Desktop only)
    // ========================================
    if (window.innerWidth > 768) {
        let parallaxTicking = false;
        
        function updateParallax() {
            const scrolled = window.scrollY;
            const heroHeight = $('.Top').height();
            
            if (scrolled < heroHeight) {
                const parallaxValue = scrolled * 0.3;
                $('.top_image').css({
                    'transform': `translateY(${parallaxValue}px) scale(1.1)`
                });
            }
            parallaxTicking = false;
        }

        $(window).on('scroll', function() {
            if (!parallaxTicking) {
                window.requestAnimationFrame(updateParallax);
                parallaxTicking = true;
            }
        });
    }

    // ========================================
    // TOUCH SUPPORT FOR HERO SECTIONS
    // ========================================
    if ('ontouchstart' in window) {
        $('.top_image_section').on('touchstart', function() {
            $(this).addClass('touch-active');
        });
        
        $('.top_image_section').on('touchend', function() {
            const $this = $(this);
            setTimeout(function() {
                $this.removeClass('touch-active');
            }, 300);
        });
    }

    // ========================================
    // SLICK BANNER (if exists)
    // ========================================
    var sliderImg = $('.list--bnr li').length;
    if(sliderImg > 1){
        $('.list--bnr').slick({
            autoplay: true,
            centerMode: true,
            dots: false,
            prevArrow: '<a class="slick-prev" href="#"><svg><use xlink:href="#arrow"/></svg></a>',
            nextArrow: '<a class="slick-next" href="#"><svg><use xlink:href="#arrow"/></svg></a>',
            centerPadding: '32%',
            pauseOnFocus: true,
            responsive: [{
                breakpoint: 960,
                settings: {
                    centerMode: true,
                    centerPadding: '16%',
                }
            }]
        });
    } else {
        $('.section--bnr').addClass('section--bnr--single');
    }
});
