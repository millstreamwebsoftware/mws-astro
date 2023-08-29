---
_schema: default
title: Home
content_blocks:
  - _bookshop_name: layout/slider
    slides:
      - content:
        background_color:
        background_image: /images/hero/cafe-001.jpg
        background_fit: cover
      - content:
        background_color:
        background_image: /images/hero/espresso-001.jpg
        background_fit: cover
      - content:
        background_color:
        background_image: /images/hero/espresso.jpg
        background_fit: cover
      - content:
        background_color:
        background_image: /images/hero/flat-white.jpg
        background_fit: cover
      - content:
        background_color:
        background_image: /images/hero/img-3791.jpg
        background_fit: cover
    height: 80
    gap: 0
    autoplay: 5
    perView: 2
    focusAtCenter: false
    focusAt: 0
    bound: false
    showBullets: false
    showArrows: false
    hoverpause: false
    indent: false
    transition: Fader
    animationDuration: 2.5
    classes:
      - TOHC-Hero
  - _bookshop_name: richtext
    content: >-
      <p class="align-center"><img alt="Now Open" width="305" height="79"
      src="/images/now-open.svg" /></p>


      <h2 class="align-center">Open Hours</h2>


      <h3 class="highlight-1 align-center">Open 7 days per week as
      follows...</h3>


      <table><tbody><tr><th class="align-right">Monday + Tuesday</th><td>6.00am
      – 11.00am</td></tr><tr><th class="align-right">Wednesday +
      Thursday</th><td>6.00am – 1.00pm</td></tr><tr><th
      class="align-right">Friday – Sunday</th><td>6.00am –
      2.00pm</td></tr></tbody></table>


      <h2 class="align-center">The Oarhouse Cafe, on the banks of the Swan
      River, Bayswater.</h2>


      <p class="align-center">Serving fantastic locally roasted coffee from
      Leftfield, delicious Gelato from Pietro Gelataria, breads from Loafers
      Artisan, and a handpicked selection of freshly made cakes and slices.</p>
  - _bookshop_name: gallery
    height: 40
    columns: 3
    indent: false
    images:
      - image: /images/gallery/tohc-choc-experiment-oct-10-2022.jpeg
        title:
        description:
      - image: /images/gallery/tohc-experiment-oct-2022.jpeg
        title:
        description:
      - image: /images/gallery/tohc-raspberry-coconut-oct-2022.jpeg
        title:
        description:
      - image: /images/gallery/tohc-cinnamon-scrolls-type-icing-001.jpeg
        title:
        description:
      - image: /images/gallery/tohc-dolngait-slice-oct-2022.jpeg
        title:
        description:
      - image: /images/gallery/tohc-lemon-tart-experiments-oct-2022.jpeg
        title:
        description:
  - _bookshop_name: layout/columns
    content_blocks:
      - _bookshop_name: richtext
        content: <h1 class="highlight-2 align-center">Our Story</h1>
        background_color: "#f5f5f5"
      - _bookshop_name: richtext
        content: >-
          The idea of a cafe on the banks of our beautiful Swan River was first
          hatched on a cold and wet morning more than 20 years ago after having
          had a great row with some good mates, and thinking the only thing that
          could make this better was a warm spot with a great coffee and a good
          feed. Since then we have had a life full of adventures and another
          fulfilling career but that lingering desire to create a space where
          everyone would be welcome and where we could share this beautiful
          location has never left us.
        background_color: rgb(245, 245, 245)
      - _bookshop_name: richtext
        content: >-
          We have worked incredibly hard and had wonderful support from everyone
          to finally create this wonderful space that we hope you love as much
          as we do. Our goal is to create a space where everyone feels welcome
          and we provide a sense of community for everyone. Of course we love
          our coffee and food and will endeavour to bring you great tasting
          ethically sourced offerings.
        background_color: rgb(245, 245, 245)
    layout:
      - 1
      - 2
    collapse: true
  - _bookshop_name: layout/slider
    slides:
      - content: ""
        background_color:
        background_image: /images/brands/leftfield-coffee-roasters.png
        background_fit: contain
      - content: ""
        background_color:
        background_image: /images/brands/loafers-artisan-logo.png
        background_fit: contain
      - content: ""
        background_color:
        background_image: /images/brands/pietro-gelateria.webp
        background_fit: contain
    height: 30
    gap: 10
    autoplay: 3
    perView: 2
    focusAtCenter: true
    focusAt: 0
    bound: false
    showBullets: true
    showArrows: true
    indent: true
    transition: Carousel
    animationDuration: 0.4
    hoverpause: false
    classes:
      - TOHC-Brands
  - _bookshop_name: layout/columns
    content_blocks:
      - _bookshop_name: form
        name: contact
        action: https://usebasin.com/f/88179f198898
        background_color: rgb(250, 250, 250)
        form_blocks:
          - _bookshop_name: form/info
            content: |-
              ## Contact details

              _130 Milne Street, Bayswater (AP Hinds Reserve)_

              _Perth, WA, Australia, Western Australia_

              ### Contact us
            style: Default
          - _bookshop_name: form/inputs/text
            name: name
            label: Name
            placeholder: ""
            required: true
            minlength: 5
            maxlength: 32
          - _bookshop_name: form/inputs/email
            name: email
            label: Email
            placeholder: ""
            required: true
          - _bookshop_name: form/inputs/textarea
            name: message
            label: Message
            placeholder: ""
            required: true
            minlength: 0
            maxlength: 3000
      - _bookshop_name: map
        lat: -31.930914
        lng: 115.917333
        zoom: 16
        height: 40
        indent: false
        style:
    layout:
      - 2
    collapse: true
show_global_header: true
show_global_footer: true
---
