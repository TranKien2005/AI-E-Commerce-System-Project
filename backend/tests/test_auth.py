"""Auth endpoint tests: register, login, refresh, logout, OTP, password reset."""

B_EMAIL, B_PWD = "buyer@example.com", "Buyer@123"


class TestRegister:
    def test_register_weak_password(self, client):
        r = client.post(
            "/api/v1/auth/register",
            json={"email": "weak@t.com", "password": "abc", "full_name": "X"},
        )
        assert r.status_code in (400, 422)

    def test_register_duplicate(self, client):
        r = client.post(
            "/api/v1/auth/register",
            json={"email": B_EMAIL, "password": "Buyer@123", "full_name": "X"},
        )
        assert r.status_code == 409

    def test_register_missing_fields(self, client):
        r = client.post("/api/v1/auth/register", json={"email": "x@t.com"})
        assert r.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        r = client.post(
            "/api/v1/auth/login", json={"email": B_EMAIL, "password": B_PWD}
        )
        assert r.status_code == 200
        d = r.json()["data"]
        assert "access_token" in d and "refresh_token" in d

    def test_login_requires_verified_email(self, client):
        from app.services.auth_service import _otp_store

        email, password = "pending-login@example.com", "Pending@123"
        register = client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "full_name": "Pending Login"},
        )
        assert register.status_code in (200, 201)

        blocked = client.post(
            "/api/v1/auth/login", json={"email": email, "password": password}
        )
        assert blocked.status_code == 403

        otp_code = _otp_store.get(email, {}).get("code", "")
        assert otp_code
        verified = client.post(
            "/api/v1/auth/verify-otp", json={"email": email, "otp": otp_code}
        )
        assert verified.status_code == 200

        allowed = client.post(
            "/api/v1/auth/login", json={"email": email, "password": password}
        )
        assert allowed.status_code == 200

    def test_login_wrong_password(self, client):
        r = client.post(
            "/api/v1/auth/login", json={"email": B_EMAIL, "password": "Wrong@999"}
        )
        assert r.status_code == 401

    def test_login_nonexistent_user(self, client):
        r = client.post(
            "/api/v1/auth/login", json={"email": "noone@x.com", "password": "Abc@1234"}
        )
        assert r.status_code == 401


class TestTokenLifecycle:
    def test_refresh_token(self, client):
        login = client.post(
            "/api/v1/auth/login", json={"email": B_EMAIL, "password": B_PWD}
        )
        rt = login.json()["data"]["refresh_token"]
        r = client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r.status_code == 200

    def test_logout_revokes_token(self, client):
        login = client.post(
            "/api/v1/auth/login", json={"email": B_EMAIL, "password": B_PWD}
        )
        rt = login.json()["data"]["refresh_token"]
        client.post("/api/v1/auth/logout", json={"refresh_token": rt})
        r = client.post("/api/v1/auth/refresh", json={"refresh_token": rt})
        assert r.status_code == 401

    def test_refresh_invalid_token(self, client):
        r = client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})
        assert r.status_code == 401


class TestPasswordReset:
    def test_forgot_password(self, client):
        r = client.post("/api/v1/auth/forgot-password", json={"email": B_EMAIL})
        assert r.status_code == 200

    def test_verify_otp_wrong_code(self, client):
        """Wrong OTP should fail."""
        # Generate an OTP first
        client.post("/api/v1/auth/forgot-password", json={"email": B_EMAIL})
        r = client.post(
            "/api/v1/auth/verify-otp", json={"email": B_EMAIL, "otp": "000000"}
        )
        assert r.status_code == 400

    def test_verify_otp_correct_code(self, client):
        """Correct OTP from internal store should succeed."""
        from app.services.auth_service import _otp_store

        # Generate OTP
        client.post("/api/v1/auth/forgot-password", json={"email": B_EMAIL})
        otp_code = _otp_store.get(B_EMAIL, {}).get("code", "")
        assert otp_code  # OTP was generated
        r = client.post(
            "/api/v1/auth/verify-otp", json={"email": B_EMAIL, "otp": otp_code}
        )
        assert r.status_code == 200

    def test_reset_password_bad_otp(self, client):
        r = client.post(
            "/api/v1/auth/reset-password",
            json={"email": B_EMAIL, "otp": "", "new_password": "New@12345"},
        )
        assert r.status_code == 400

    def test_reset_password_real_otp(self, client):
        """Full flow: forgot → get OTP → reset password."""
        from app.services.auth_service import _otp_store

        client.post("/api/v1/auth/forgot-password", json={"email": B_EMAIL})
        otp_code = _otp_store.get(B_EMAIL, {}).get("code", "")
        r = client.post(
            "/api/v1/auth/reset-password",
            json={"email": B_EMAIL, "otp": otp_code, "new_password": B_PWD},
        )
        assert r.status_code == 200
        # Can still login with old/new password (we reset to same password here)
        login = client.post(
            "/api/v1/auth/login", json={"email": B_EMAIL, "password": B_PWD}
        )
        assert login.status_code == 200
