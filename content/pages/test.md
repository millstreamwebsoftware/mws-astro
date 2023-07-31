---
title: Test Page
content_blocks:
  - _bookshop_name: astrotest
    text: Test
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
show_global_header: true
show_global_footer: true
---
