$(function(){
    //loading 
    var referrer = document.referrer;
    var host = location.host;
    if (referrer.indexOf(host) == -1){
        $(window).load(function(){
            $('body').addClass('start');
        });
    } else {
        $('body').addClass('already');
    }

    //scroll 
    $(window).on('scroll', function() {
        if ($(this).scrollTop() > 0) {
            $('body').addClass('down');
        } else {
            $('body').removeClass('down');
        }
    });

    // 视频水平滚动导航
    const videoContainer = $('.list--video');
    const scrollAmount = videoContainer.width() / 3; // 每次滚动三分之一宽度

    // 添加导航按钮
    videoContainer.wrap('<div class="video-wrapper"></div>');
    const wrapper = $('.video-wrapper');


    // 点击按钮滚动
    $('.nav-btn.prev').on('click', function() {
        videoContainer.animate({
            scrollLeft: '-=' + scrollAmount
        }, 300);
    });

    $('.nav-btn.next').on('click', function() {
        videoContainer.animate({
            scrollLeft: '+=' + scrollAmount
        }, 300);
    });

    // 使视频项水平排列
    videoContainer.css({
        'display': 'flex',
        'overflow-x': 'auto',
        'scroll-behavior': 'smooth',
        'gap': '20px',
        'padding': '20px 0'
    });

    // 设置每个视频项的宽度
    $('.list--video > div').css({
        'flex': '0 0 calc(33.333% - 14px)',
        'min-width': '300px'
    });

    // 响应式处理
    function handleResize() {
        if (window.innerWidth <= 600) {
            $('.list--video > div').css('flex', '0 0 100%');
        } else if (window.innerWidth <= 960) {
            $('.list--video > div').css('flex', '0 0 calc(50% - 10px)');
        } else {
            $('.list--video > div').css('flex', '0 0 calc(33.333% - 14px)');
        }
    }

    // 监听窗口大小变化
    $(window).on('resize', handleResize);
    handleResize();

    //banner轮播（保持不变）
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