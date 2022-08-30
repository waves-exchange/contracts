package logger

import (
	"github.com/rs/zerolog"
	"os"
)

func NewLogger(logLevel string) (l Logger, err error) {
	level, err := zerolog.ParseLevel(logLevel)
	if err != nil {
		return
	}

	l = Logger{
		ZL: zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).Level(level).With().Timestamp().Caller().Logger(),
	}
	return
}
