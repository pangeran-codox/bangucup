// Package ticket memverifikasi tiket WebSocket yang diterbitkan Laravel
// (lihat app/Support/WsTicket.php di sisi PHP).
//
// Format: base64url(JSON{uid,exp,jti}) "." hex(HMAC-SHA256(secret, base64url(...)))
package ticket

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// Claims adalah isi tiket yang sudah terverifikasi.
type Claims struct {
	UserID int64  `json:"uid"`
	Expiry int64  `json:"exp"`
	JTI    string `json:"jti"`
}

var (
	ErrMalformed = errors.New("ticket: format tidak valid")
	ErrSignature = errors.New("ticket: tanda tangan tidak valid")
	ErrExpired   = errors.New("ticket: kedaluwarsa")
)

// Verify memeriksa tanda tangan dan masa berlaku tiket.
func Verify(raw, secret string, now time.Time) (*Claims, error) {
	if secret == "" {
		return nil, ErrSignature
	}

	parts := strings.Split(raw, ".")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return nil, ErrMalformed
	}
	payload, sigHex := parts[0], parts[1]

	gotSig, err := hex.DecodeString(sigHex)
	if err != nil {
		return nil, ErrMalformed
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	if !hmac.Equal(gotSig, mac.Sum(nil)) { // perbandingan waktu-konstan
		return nil, ErrSignature
	}

	body, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return nil, ErrMalformed
	}

	var c Claims
	if err := json.Unmarshal(body, &c); err != nil || c.JTI == "" || c.UserID <= 0 {
		return nil, ErrMalformed
	}

	if now.Unix() >= c.Expiry {
		return nil, ErrExpired
	}

	return &c, nil
}
