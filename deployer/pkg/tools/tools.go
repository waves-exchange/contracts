package tools

import (
	"context"
	"encoding/binary"
	"fmt"
	"github.com/wavesplatform/gowaves/pkg/client"
	"github.com/wavesplatform/gowaves/pkg/crypto"
	"github.com/wavesplatform/gowaves/pkg/proto"
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

func SignBroadcastWait(
	ctx context.Context,
	networkByte proto.Scheme,
	client *client.Client,
	tx proto.Transaction,
	prv crypto.SecretKey,
) error {
	_, err := tx.Validate(networkByte)
	if err != nil {
		return fmt.Errorf("tx.Validate: %w", err)
	}

	err = tx.Sign(networkByte, prv)
	if err != nil {
		return fmt.Errorf("tx.Sign: %w", err)
	}

	txHashBytes, err := tx.GetID(networkByte)
	if err != nil {
		return fmt.Errorf("tx.GetID: %w", err)
	}

	txHash, err := crypto.NewDigestFromBytes(txHashBytes)
	if err != nil {
		return fmt.Errorf("crypto.NewDigestFromBytes: %w", err)
	}

	_, e := client.Transactions.Broadcast(ctx, tx)
	if e != nil {
		return fmt.Errorf("client.Transactions.Broadcast: %w", e)
	}

	e = waitMined(ctx, client, txHash)
	if e != nil {
		return fmt.Errorf("waitMined: %w", e)
	}
	return nil
}

func waitMined(ctx context.Context, client *client.Client, txHash crypto.Digest) error {
	try := 0
	for {
		try += 1
		_, _, err := client.Transactions.Info(ctx, txHash)
		if err == nil {
			return nil
		}
		if try >= 100 {
			return fmt.Errorf("client.Transactions.Info: %w", err)
		}
		time.Sleep(10 * time.Second)
	}
}
