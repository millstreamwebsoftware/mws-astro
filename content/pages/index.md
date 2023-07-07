---
_schema: default
title: Home
content_blocks:
  - _bookshop_name: astrotest
    text: test!
  - _bookshop_name: layout/slider
    slides:
      - content: Test Content
        background_color: "#ffcece"
        background_image: /images/hero/cafe-001.jpg
      - content: More test content!
        background_color: "#fef1f0"
        background_image:
      - content: Third test
        background_color: "#afedff"
        background_image:
    height: 50
    gap: 0
    autoplay: 4
    perView: 2
    focusAtCenter: false
    focusAt: 0
    bound: false
    showBullets: true
    showArrows: true
    indent: false
    transition: Fader
    animationDuration: 1
  - _bookshop_name: form
    name: contact-us
    action: https://usebasin.com/f/88179f198898
    form_blocks:
      - _bookshop_name: form/info
        content: This is a test of the form info block; Default style
        style: Default
      - _bookshop_name: form/info
        content: This is a test of the form info block; Info style
        style: Info
      - _bookshop_name: form/info
        content: This is a test of the form info block; Warning style
        style: Warning
      - _bookshop_name: form/info
        content: This is a test of the form info block; Details style
        style: Details
      - _bookshop_name: form/inputs/text
        name: name
        label: Name
        placeholder: Your Name
        required: true
        minlength: 2
        maxlength: 32
      - _bookshop_name: form/inputs/email
        name: email
        label: Email
        placeholder: your@email.here
        required:
      - _bookshop_name: form/inputs/textarea
        name: description
        label: Details
        placeholder: Get in contact!
        required: true
        minlength: 0
        maxlength: 0
      - _bookshop_name: form/fieldset
        legend: Checkboxes!
        form_blocks:
          - _bookshop_name: form/inputs/checkbox
            name: terms-and-conditions
            label: Do you agree with our terms and conditions?
            checked:
            required: true
          - _bookshop_name: form/inputs/checkbox
            name: newsletter
            label: Would you like to recieve our newsletter?
            checked: true
            required:
      - _bookshop_name: form/inputs/select
        name: dropdown
        label: Dropdown Select
        options:
          - test
          - options
          - for
          - dropdown
        required: true
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
        title: Title
        description: Description
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
  - _bookshop_name: richtext
    content: |-
      <h1 class="align-center">Our Story</h1>

      ---
  - _bookshop_name: layout/columns
    content_blocks:
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
      - _bookshop_name: richtext
        content: >-
          We have worked incredibly hard and had wonderful support from everyone
          to finally create this wonderful space that we hope you love as much
          as we do. Our goal is to create a space where everyone feels welcome
          and we provide a sense of community for everyone. Of course we love
          our coffee and food and will endeavour to bring you great tasting
          ethically sourced offerings.
---
