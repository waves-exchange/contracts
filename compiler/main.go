package main

import (
	"bytes"
	"context"
	"fmt"
	"github.com/rs/zerolog"
	"github.com/wavesplatform/gowaves/pkg/client"
	"io"
	"net/http"
	"os"
	"path"
	"time"
)

type WavesClient interface {
	Do(ctx context.Context, req *http.Request, v interface{}) (*client.Response, error)
	GetOptions() client.Options
}

type API struct {
	WavesClient WavesClient
}

type CompileResult struct {
	Script               string
	Complexity           int
	VerifierComplexity   int
	CallableComplexities interface{}
	ExtraFee             int
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), time.Hour)
	defer cancel()

	log := zerolog.
		New(zerolog.ConsoleWriter{Out: os.Stderr}).
		Level(zerolog.DebugLevel).
		With().
		Timestamp().
		Caller().
		Logger()

	testnetNode, ok := os.LookupEnv("TESTNETNODE")
	if !ok {
		panic("no env TESTNETNODE")
	}
	mainnetNode, ok := os.LookupEnv("MAINNETNODE")
	if !ok {
		panic("no env MAINNETNODE")
	}

	dir, err := os.ReadDir(path.Join("..", "ride"))
	if err != nil {
		panic(err)
	}

	type cfg struct {
		node string
		kind string
	}

	for _, _file := range dir {
		file := _file
		for _, c := range []cfg{{
			node: testnetNode,
			kind: "testnet",
		}, {
			node: mainnetNode,
			kind: "mainnet",
		}} {
			_, e := compile(ctx, path.Join("..", "ride", file.Name()), c.node)
			if e != nil {
				log.Error().
					Str("file", file.Name()).
					Str("node", c.node).
					Str("kind", c.kind).
					Err(e).
					Msg("compilation failed")
			}
			log.Info().
				Str("file", file.Name()).
				Str("node", c.node).
				Str("kind", c.kind).
				Msg("compiled")
		}
	}
}

func NewAPI(wavesClient WavesClient) *API {
	return &API{
		WavesClient: wavesClient,
	}
}

func compile(ctx context.Context, path, node string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("os.Open: %w", err)
	}

	body, err := io.ReadAll(f)
	if err != nil {
		return "", fmt.Errorf("io.ReadAll: %w", err)
	}

	wavesClient, err := client.NewClient(
		client.Options{BaseUrl: node, Client: &http.Client{Timeout: time.Minute}})
	if err != nil {
		return "", err
	}

	wavesApi := NewAPI(wavesClient)

	u := fmt.Sprintf("%s/utils/script/compileCode?compact=true", wavesApi.WavesClient.GetOptions().BaseUrl)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("http.NewRequestWithContext: %w", err)
	}
	req.Header.Add("Accept", "application/json")
	req.Header.Add("Content-Type", "text/plain")

	var compileResult CompileResult
	_, err = wavesApi.WavesClient.Do(ctx, req, &compileResult)

	if err != nil {
		return "", fmt.Errorf("a.WavesClient.Do: %w", err)
	}

	return compileResult.Script, nil
}
