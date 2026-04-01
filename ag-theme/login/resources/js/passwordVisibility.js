document.querySelectorAll('[data-password-toggle]').forEach(function(button) {
    var input = document.getElementById(button.getAttribute('aria-controls'));
    var iconShow = button.getAttribute('data-icon-show');
    var iconHide = button.getAttribute('data-icon-hide');
    var icon = button.querySelector('i');

    button.style.display = '';

    button.addEventListener('click', function() {
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = iconHide;
        } else {
            input.type = 'password';
            icon.className = iconShow;
        }
    });
});