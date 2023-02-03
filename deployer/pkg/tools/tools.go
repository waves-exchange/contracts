package tools

import (
	"encoding/binary"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"math"
	"time"
)

func GetPrivateAndPublicKey(seed []byte) (privateKey crypto.SecretKey, publicKey crypto.PublicKey, err error) {
	n := 0
	s := seed
	iv := make([]byte, 4)
	binary.BigEndian.PutUint32(iv, uint32(n))
	s = append(iv, s...)
	accSeed, err := crypto.SecureHash(s)
	if err != nil {
		return crypto.SecretKey{}, crypto.PublicKey{}, err
	}
	return crypto.GenerateKeyPair(accSeed[:])
}

func CalcSetScriptFee(script []byte) uint64 {
	const min = 1300000
	base := uint64(100000)
	additional := uint64(400000)
	kb := math.Ceil(float64(len(script)) / float64(1000))
	res := uint64(kb)*base + additional
	if res < min {
		return min
	}
	return res
}

func Timestamp() uint64 {
	return uint64(time.Now().UnixMilli())
}
