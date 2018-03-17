// import "babel-polyfill";
import React from "react";
import { render } from "react-dom";
import axios from "axios";
import soundfontPlayer from "soundfont-player";

import { getInstrumentName } from "./get-instrument-name";
import {
  getInstrument,
  loadInstruments
} from "./load-instrument";

import MidiPlayer from "midi-player-js";

const loadMidi = async url => {
  const { data } = await axios.get(url, {
    responseType: "arraybuffer"
  });
  return data;
};

const getNoteKey = ({ noteName, track, channel }) => {
  return `${noteName}_${track}_${channel}`;
};

const smooshObjs = (obj1, obj2) => {
  return Object.assign({}, obj1, obj2);
};

const midiEventsToNoteActions = midiEvent => {
  const {
    channel,
    noteName,
    track,
    name: midiEventType
  } = midiEvent;
  const noteKey = getNoteKey({ noteName, track, channel });
  const instrumentName = getInstrumentName(channel);
  if (midiEventType === "Note on") {
    return {
      type: "NOTE_ON",
      payload: {
        key: noteKey,
        instrumentName,
        channel,
        noteName
      }
    };
  } else if (midiEventType === "Note off") {
    return {
      type: "NOTE_OFF",
      payload: {
        key: noteKey,
        instrumentName,
        channel,
        noteName
      }
    };
  } else {
    return null;
  }
};

const possibleMidiPlayerStates = {
  paused: "paused",
  playing: "playing",
  stopped: "stopped"
};

const possibleLoadingStates = {
  loading: "loading",
  loaded: "loaded",
  errored: "errored"
};

let playingNotes = {};

const playNote = ({ instrument, noteName, noteKey }) => {
  if (!(noteKey in playingNotes)) {
    playingNotes[noteKey] = [];
  }
  playingNotes[noteKey].push(instrument.play(noteName));
};

class ReactMidiPlayer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      areInstrumentsLoaded: false
    };
    this.midiPlayer = new MidiPlayer.Player();
  }
  async componentDidMount() {
    const { url } = this.props;
    const midi = await loadMidi(url);
    this.midiPlayer.loadArrayBuffer(midi);
    const instruments = await loadInstruments(
      this.midiPlayer
    );
    this.setState({
      areInstrumentsLoaded: true,
      playableInstruments: instruments
    });
    this.midiPlayer.on("midiEvent", midiEvent => {
      const action = midiEventsToNoteActions(midiEvent);
      if (action === null) return;
      const { payload, type } = action;
      const {
        instrumentName,
        noteName,
        key,
        channel
      } = payload;
      if (!channel in instruments) {
        console.error(`${instrumentName} not loaded`);
        return;
      }
      switch (type) {
        case "NOTE_ON": {
          console.log(instruments[channel]);
          playNote({
            instrument: instruments[channel],
            noteName,
            noteKey: key
          });
        }
        case "NOTE_OFF": {
          console.log("Left as an exercise to the reader");
        }
        default: {
          return;
        }
      }
    });
  }

  render() {
    return (
      <div>
        {this.state.areInstrumentsLoaded === true ? (
          <div>
            Loaded
            <button
              onClick={() => {
                this.midiPlayer.play();
              }}
            >
              Play
            </button>
            <button
              onClick={() => {
                this.midiPlayer.pause();
              }}
            >
              Pause
            </button>
            <button
              onClick={() => {
                this.midiPlayer.stop();
              }}
            >
              Stop
            </button>
          </div>
        ) : (
          "Loading Instruments"
        )}
      </div>
    );
    // tracks.map((track, i) => (
    //   <ReactMidiTrack key={i} instrument={instrument} />
    // ))
  }
}
ReactMidiPlayer.defaultProps = {
  midiPlayer: null,
  midiPlayerState: ""
};
class ReactMidiPlayerDemo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      player: null,
      playerState: "stopped"
    };
  }
  componentDidMount() {
    // const { url } = this.props;
    // loadMidi(url).then(midi => {
    //   const player = new MidiPlayer.Player();
    //   player.loadArrayBuffer(midi);
    //   this.setState({ player });
    // });
  }
  componentDidUpdate(prevProps, prevState) {
    // const { url } = this.props;
    // const previousURL = prevProps.url;
    // if (url !== previousURL) {
    //   loadMidi(url).then(console.log);
    // }
  }
  render() {
    const { url } = this.props;
    return (
      <div>
        ReactMidiPlayerDemo Playing url : {url}
        <ReactMidiPlayer
          midiPlayer={this.state.player}
          midiPlayerState={this.state.playerState}
          url={url}
        />
      </div>
    );
  }
}

const App = () => (
  <ReactMidiPlayerDemo
    url={`https://raw.githubusercontent.com/grimmdude/MidiPlayerJS/master/demo/midi/zelda.mid`}
  />
);

render(<App />, document.getElementById("root"));
