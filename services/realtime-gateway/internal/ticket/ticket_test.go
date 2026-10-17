package ticket

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"os"
	"testing"
	"time"
)

const secret = "0123456789abcdef0123456789abcdef"

func sign(payloadJSON, key string) string {
	p := base64.RawURLEncoding.EncodeToString([]byte(payloadJSON))
	m := hmac.New(sha256.New, []byte(key))
	m.Write([]byte(p))
	return p + "." + hex.EncodeToString(m.Sum(nil))
}

func TestVerifyValid(t *testing.T) {
	now := time.Now()
	tk := sign(fmt.Sprintf(`{"uid":7,"exp":%d,"jti":"abc"}`, now.Add(time.Minute).Unix()), secret)
	c, err := Verify(tk, secret, now)
	if err != nil || c.UserID != 7 || c.JTI != "abc" {
		t.Fatalf("seharusnya valid, got %v %v", c, err)
	}
}

func TestVerifyRejects(t *testing.T) {
	now := time.Now()
	exp := now.Add(time.Minute).Unix()
	valid := sign(fmt.Sprintf(`{"uid":7,"exp":%d,"jti":"abc"}`, exp), secret)
	otherPayload := base64.RawURLEncoding.EncodeToString([]byte(`{"uid":1,"exp":9999999999,"jti":"x"}`))

	cases := map[string]struct {
		ticket, key string
		want        error
	}{
		"secret salah":        {valid, "kunci-lain-kunci-lain-kunci-lain!!", ErrSignature},
		"secret kosong":       {valid, "", ErrSignature},
		"kedaluwarsa":         {sign(fmt.Sprintf(`{"uid":7,"exp":%d,"jti":"abc"}`, now.Add(-time.Second).Unix()), secret), secret, ErrExpired},
		"payload diganti":     {otherPayload + "." + valid[len(valid)-64:], secret, ErrSignature},
		"tanpa titik":         {"abc", secret, ErrMalformed},
		"kosong":              {"", secret, ErrMalformed},
		"signature bukan hex": {"abc.zzzz", secret, ErrMalformed},
		"tanpa jti":           {sign(fmt.Sprintf(`{"uid":7,"exp":%d}`, exp), secret), secret, ErrMalformed},
		"uid nol":             {sign(fmt.Sprintf(`{"uid":0,"exp":%d,"jti":"a"}`, exp), secret), secret, ErrMalformed},
	}
	for name, tc := range cases {
		if _, err := Verify(tc.ticket, tc.key, now); err != tc.want {
			t.Errorf("%s: want %v, got %v", name, tc.want, err)
		}
	}
}

// Interop: tiket dibuat oleh PHP (WsTicket::make) dan diverifikasi di Go.
// Dijalankan bila env PHP_TICKET diisi.
func TestVerifyTicketFromPHP(t *testing.T) {
	tk := os.Getenv("PHP_TICKET")
	if tk == "" {
		t.Skip("PHP_TICKET tidak diisi")
	}
	c, err := Verify(tk, secret, time.Now())
	if err != nil || c.UserID != 42 {
		t.Fatalf("tiket dari PHP harus valid: %v %v", c, err)
	}
}
