var cancelAnim = false;
var audioAvailable = !isLocalFilePage();

function isLocalFilePage() {
    return window.location.protocol === 'file:';
}

function getPageIdFromLocation() {
    const rawPath = (window.location.pathname || '').split('/').filter(Boolean).pop() || '';
    const name = rawPath.replace(/\.html?$/i, '').replace(/[^a-z0-9_-]/gi, '');

    if (!name || name === 'index') {
        return 'home';
    }

    return name;
}

function audioTrack(source, options) {
    if (isLocalFilePage()) {
        return {
            play: function() { return this; },
            pause: function() { return this; },
            fade: function() { return this; },
            volume: function() { return 0; },
            rate: function(value) {
                if (typeof value !== 'undefined') {
                    this._rate = value;
                }
                return this._rate || 1;
            },
            targetVolume: 0,
            trackName: 'disabled'
        };
    }

    return new Howl(Object.assign({
        src: [source],
        onloaderror: function() { audioAvailable = false; },
        onplayerror: function() { audioAvailable = false; }
    }, options));
}

var home = audioTrack('audio/poclsite.mp3', {
    loop: true,
    preload: true,
    sprite: {
        main: [100, 192000, true],
        __default: [100, 192000, true]
    },
    volume: 0
});
home.targetVolume = 0.2;
home.trackName = "home";

var dev = audioTrack('audio/dev.ogg', {
    preload: true,
    loop: true,
    sprite: {
        __default: [100, 112500, true]
    },
    volume: 0
});
dev.targetVolume = 0.75;
dev.trackName = "dev";

var registry = audioTrack('audio/registrytheme.mp3', {
    preload: true,
    loop: true,
    sprite: {
        __default: [100, 128000, true]
    },
    volume: 0
});
registry.targetVolume = 0.5;
registry.trackName = "registry";

var lobster = audioTrack('audio/lob.ogg', {
    preload: true,
    loop: true,
    sprite: {
        __default: [100, 86500, true]
    },
    volume: 0
});
lobster.targetVolume = 0.3;
lobster.trackName = "lobster";
			
var gallerySfx = audioTrack('audio/gallery.mp3', {
    preload: true,
    loop: false,
    volume: 0.4
});
			
var clickSfx = audioTrack('audio/click.mp3', {
    preload: true,
    loop: false,
    volume: 0.5
});
			
var hoverSfx = audioTrack('audio/hover.mp3', {
    preload: true,
    loop: false,
    volume: 0.25
});
var currentTheme = home;

function changeTrack(track) {
    if (!audioAvailable || !track) return;
    console.log(`changing from ${currentTheme.trackName} to ${track.trackName}`)
    if(track.trackName != currentTheme.trackName) {
        currentTheme.fade(currentTheme.volume(), 0, 500);
        setTimeout(()=> {currentTheme.pause(); currentTheme = track;}, 500);
        track.play();
        track.fade(0, track.targetVolume, 500);
    }
}

function getPageTheme(){
    switch($('body').attr('id')) {
        case "dev":
            return dev;
        case "lobster":
            return lobster;
        case "about":
            home.rate(0.5);
            return home;
        case "PAXY":
            home.rate(2);
            return home;
        case "registry":
            return registry;
        default: 
            home.rate(1);
            return home;
    }
}

//launched once on page load
var ranScript = false
var pocl = { cursor: {} }
$(window).on("load", function() {
    ranScript = true
    //credits - to change, just make sure you keep the %c at the start
    console.log('%cdeveloped by https://corru.works', 'background: black; color: #5000ff;padding:20px;font-size:2em;border: 1px solid;display:block;');
    console.log('%cthe original ocean shader on the desktop homepage is by Jonathan Blair!! see the page source code on the homepage for license info, i just hacked it up to look really trippy: https://codepen.io/knoland/pen/XKxAJb', 'display: block;background: black; color: #ff0033;padding:20px;font-size:1.25em;border: 1px solid');
    console.log('%csound effects are from silent hill 3', 'display: block;background: black; color: #ff0033;padding:5px;font-size:1.25em;border: 1px solid');
    console.log('%cmain, about & dev credits page music is by corru.works', 'display: block;background: black; color: hotpink;padding:5px;font-size:1.25em;border: 1px solid');
    console.log('%csecret page music is from the spiderman 2 game... you\'ll know when you find it', 'display: block;background: black; color: red;padding:5px;font-size:0.5em;border: 1px solid');
    
    // VISITANT UPDATE - sets up the definition box
    // i literally took this from corru.observer but self plagiarism is ok and don't let anyone tell you otherwise >:) 
    document.body.insertAdjacentHTML('beforeend', '<div id="definition-box"></div>')
    setInterval(()=>{
        //definition tracking
        try { 
            pocl.hovering = document.elementFromPoint(pocl.cursor.x, pocl.cursor.y)
            pocl.defbox = document.getElementById('definition-box')

            if(pocl.hovering.hasAttribute('definition')) {
                pocl.defbox.style.setProperty("--x", pocl.cursor.x)
                pocl.defbox.style.setProperty("--y", pocl.cursor.y)

                if(pocl.cursor.x < (window.innerWidth / 2)) pocl.defbox.style.setProperty("--xFlip", 0); else pocl.defbox.style.setProperty("--xFlip", -1)
                if(pocl.cursor.y < (window.innerHeight / 2)) pocl.defbox.style.setProperty("--yFlip", 0); else pocl.defbox.style.setProperty("--yFlip", -1)

                pocl.defbox.classList.add('active')

                pocl.defbox.innerText = pocl.hovering.getAttribute('definition')
            } else {
                pocl.defbox.classList.remove('active')
            }
        } catch(e) {} //this basically just sends all the errors into a void, since we don't care about errors on this
    }, 200)

    //currently only used for the definition box but set up in a way that it can be used later
    window.addEventListener('mousemove', e=> {
        pocl.cursor = { x: e.clientX, y: e.clientY }
    })

    //shortcut to add the credit link to every page
	$('body').append(
		`<a id='credit-link' href='dev.html'>
            <i></i>
		</a>`
	);

    //assigns the body an ID used to determine styling
    $('body').attr('id', getPageIdFromLocation());
    if($('body').attr('id') == "") {
        $('body').attr('id', 'home');
    }
    // janky method of detecting if page is a 404 page
    if ($('h2').text() == "There's nothing here.") {
        $('body').attr('id', 'err404');
      }

    //classes and timing for the intro animation
    $('body').removeClass('loading');
    $('body').removeClass('intro-0');
    $('body').addClass('intro-1');

    // first click enters immediately; no second click needed
    $('body').on('click', function(event){
        if ($('body').hasClass('loaded') || $('body').hasClass('intro-d')) {
            return;
        }

        if (audioAvailable && currentTheme && typeof currentTheme.play === 'function') {
            gallerySfx.play();
            currentTheme.play();
            currentTheme.fade(0, currentTheme.targetVolume, 2000);
        }

        //also assign some sfx here
        $('header a, nav a, #credit-link').on('mouseup', function(){
            clickSfx.play();
        })

        $('header a, nav a, #credit-link').on('mouseenter', function(){
            hoverSfx.play();
        })

        $('body').removeClass('intro-1');
        $('body').removeClass('intro-2');
        $('body').addClass('intro-d');
        $('body').addClass('loaded');
        $('body').off('click');
    })
    
    //LOAD VOLUME FROM COOKIE IF SET, ADD VOLUME/META MENU
	var volume = localStorage['volume'];
	if(volume == undefined) {
		volume = 1;
		localStorage['volume'] = volume;
	} else {
		volume = parseFloat(volume);
	}
	Howler.volume(volume);

    init();

    currentTheme = getPageTheme();
})

//run on page load or transition to another page
function init() {
    //this makes certain code re-execute if people are navigating around
    if(ranScript == false) {
        $('.reloadscript').each(function(i,o){
            $.globalEval($(this).text());
        });
        ranScript = true
    }

    //creates the gallery on the art page
    renderGallery()

    //if the page has a 'statuscheck' (used on commissions page), adds a class to it that determines styling based on whether it says open or closed
    if($('#statuscheck').length) {
        $('#statuscheck').addClass($('#statuscheck').html().toLowerCase().replace(/ /g,'-').replace(/[^\w-]+/g,''));
    }

    $('main a:not(.gallery-option)').on('mouseup', function(){
        clickSfx.play();
    })

    $('main a').on('mouseenter', function(){
        hoverSfx.play();
    })

    $('.marquee').each(function() { //this triples marquee text to make the scrolling work
        $(this).html(`<div class="marquee-wrapper">${$(this).html() + $(this).html() + $(this).html()}<div>`)
        
    })

    //creates any shadow roots based on their contents
    document.querySelectorAll('.shadowmode').forEach(e=>{
        //grabs and clears out contents
        let originalHTML = e.innerHTML
        e.innerHTML = ""

        //recreates the contents as a shadow root
        let shadowRoot = e.attachShadow({mode: 'open'}) //open means site JS can access it, if it were closed it'd be truly evil mode
        shadowRoot.innerHTML = originalHTML

        //re-runs any scripts that should run inside the shadow root
        shadowRoot.querySelectorAll('script, delayscript').forEach(script => {
            if(script.src || script.tagName == "DELAYSCRIPT") { //re-appends to DOM if external or delayed
                let refreshScript = document.createElement('script')
                refreshScript.src = script.src || script.getAttribute('src')
                refreshScript.innerHTML = script.innerHTML || ""
                shadowRoot.appendChild(refreshScript)

                if(!script.src) eval(refreshScript.innerHTML) // if it's an inline script, rerun it
            } else {
                eval(script.innerHTML) //reruns script if it's inline and not delayed
            }
        })
    })
}

//swup is used to manage page transitions
swup = new Swup({
    animateHistoryBrowsing: true,
    containers: ["#content", "#name", "#logoanim"]
});	 

//swup events - execute primary functions defined in-page
swup.on('contentReplaced', function() {
    init();
});

swup.on('animationOutStart', function(){ 
    $('body').addClass('loading');
    $('body').removeClass('loaded');
    $('main').css('opacity', '');
    cancelAnim = true;
    ranScript = false
});

swup.on('animationInStart', function() {
    $('body').addClass('loaded');
    $('body').removeClass('loading');

    $('body').attr('id', getPageIdFromLocation());
    if($('body').attr('id') == "") {
        $('body').attr('id', 'home');
    }

    //change the music based on the page
    changeTrack(getPageTheme());
});

//art page stuff
function renderGallery(){
    if($('.galleries').length < 1) {
        return;
    }

    for (const [artGroup, o] of Object.entries(categoryList)) {
        //add nav option
        let option = `
            <a class="gallery-option" href="#${artGroup}">
                <span class="option-image" style="background-image: url(${o.thumbnail});border-radius:30%;border:1px solid white;"></span>						
                <span class="option-title">${o.name}</span>
                <span class="option-description">${o.description}</span>
            </a>
        `
        $('.gallery-nav').append(option);

        //add gallery
        $('.galleries').append(`<div id="${artGroup}" class="gallery"><h2>${o.name}</h2></div>`);
        o.images.forEach(image => {
            let display = `
                <a href="${image.src}" target="_blank">
                    <img src="${image.src}">
                    <span>${image.text}</span>
                </a>
            `;

            $(`#${artGroup}`).append(display);
        });
    }
        
    $('.gallery-option').on('mouseup', function(){
        if (audioAvailable) gallerySfx.play();
    })

    $('.gallery-option').on('click', function(){
        $('.gallery-option').removeClass('selected');
        $(this).addClass('selected');

        if($(this).attr('href') == "#") {
            $('.gallery-nav').removeClass('in-gallery');
            $('.gallery').removeClass('selected-gallery');
            window.location.replace("#");

            // slice off the remaining '#' in HTML5:    
            if (typeof window.history.replaceState == 'function') {
                history.replaceState({}, '', window.location.href.slice(0, -1));
            }
        } else {
            $('.gallery').removeClass('selected-gallery');
            $($(this).attr('href')).addClass('selected-gallery');
            $('.gallery-nav').addClass('in-gallery');
        }

        $('body, html').scrollTop( 0 );
    });

    $(`a[href="#${window.location.href.slice(0).split('#')[1]}"]`).trigger('click');
}