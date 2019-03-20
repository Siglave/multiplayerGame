document.addEventListener('DOMContentLoaded', function () {
    $("#login-form").on("submit", function (e) {
        e.preventDefault();
        var formData = new FormData(this);
        $.post(
            "/login",
            {
                "username": formData.get("username"),
                "password": formData.get("password")
            })
            .done(function (data) {
                window.location.href = '/game';
            })
            .fail(function (err) {
                $('#res-login-form').html(err.responseJSON.msg);
            });
    })
    $("#signup-form").on("submit", function (e) {
        e.preventDefault();
        var formData = new FormData(this);
        $.post(
            "/signup",
            {
                "username": formData.get("username"),
                "password": formData.get("password"),
            })
            .done(function (data) {
                $('#res-signup-form').html("Inscription réussi ! Vous pouvez vous connecter");
            })
            .fail(function (err) {
                $('#res-signup-form').html(err.responseJSON.msg);
            });
    })
});
