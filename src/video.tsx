import * as React from 'react';
import {Component, ReactNode} from 'react';
import {requestFullScreen} from './utils';

export type VideoStatus = 'playing' | 'paused' | 'errored';
export type VideoError = MediaError | null;
export interface VideoState {
  status: VideoStatus;
  currentTime: number;
  volume: number;
  duration: number;
  buffered: number;
  isMuted: boolean;
  isLoading: boolean;
  error?: VideoError;
}

export type NavigateFunction = (time: number) => void;
export type SetVolumeFunction = (volume: number) => void;

export interface VideoActions {
  play: () => void;
  pause: () => void;
  navigate: NavigateFunction;
  setVolume: SetVolumeFunction;
  requestFullscreen: () => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
}

export type RenderCallback = (videoElement: ReactNode, state: VideoState, actions: VideoActions) => ReactNode;
export interface VideoProps {
  sourceType?: 'video' | 'audio';
  src: string;
  children: RenderCallback;
  controls?: boolean;
  autoPlay?: boolean;
  preload?: string;
}

export interface VideoComponentState {
  currentTime: number;
  volume: number;
  status: VideoStatus;
  duration: number;
  buffered: number;
  isMuted: boolean;
  isLoading: boolean;
  error?: VideoError;
}

const getVolumeFromVideo = (video: SourceElement): {volume: number, isMuted: boolean} => {
  const volume = video.volume;
  const isMuted = volume === 0;

  return {
    volume,
    isMuted
  };
};

type SourceElement = HTMLVideoElement | HTMLAudioElement
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export class Video extends Component<VideoProps, VideoComponentState> {
  videoElement: HTMLVideoElement | HTMLAudioElement;

  state: VideoComponentState = {
    isLoading: true,
    buffered: 0,
    currentTime: 0,
    volume: 1,
    status: 'paused',
    duration: 0,
    isMuted: false
  }

  constructor(props: VideoProps) {
    super(props);
    const {sourceType} = props;

    // Initializing with an empty element to make TS happy
    this.videoElement = document.createElement(sourceType || 'video');
  }

  static defaultProps: Partial<VideoProps> = {
    sourceType: 'video',
    autoPlay: false,
    controls: false,
    preload: isSafari ? 'auto' : 'metadata'
  }

  componentDidUpdate(prevProps: VideoProps) {
    const {src} = this.props;
    const {currentTime, status} = this.state;
    const hasSrcChanged = prevProps.src !== src;

    if (hasSrcChanged) {
      // TODO: add test to cover this case
      if (status === 'playing') {
        this.play();
      }

      this.navigate(currentTime);
    }
  }

  onVolumeChange = (e: any) => {
    const video = e.target as SourceElement;
    const {volume, isMuted} = getVolumeFromVideo(video);
    
    this.setState({
      volume,
      isMuted
    });
  }

  onTimeUpdate = (e: any) => {
    const video = e.target as SourceElement;

    this.setState({
      currentTime: video.currentTime
    });

    if (video.buffered.length) {
      const buffered = video.buffered.end(video.buffered.length - 1);

      this.setState({buffered});
    }
  }

  onCanPlay = (e: any) => {
    const video = e.target as SourceElement;
    const {volume, isMuted} = getVolumeFromVideo(video);

    this.setState({
      volume,
      isMuted,
      isLoading: false,
      currentTime: video.currentTime,
      duration: video.duration
    });
  }

  onPlay = () => {
    this.setState({
      status: 'playing'
    });
  }

  onPause = (e: any) => {    
    this.setState({
      status: 'paused'
    });
  } 

  get videoState(): VideoState {
    const {currentTime, volume, status, duration, buffered, isMuted, isLoading, error} = this.state;

    return {
      currentTime,
      volume,
      status,
      duration,
      buffered,
      isMuted,
      isLoading,
      error
    };
  }

  play = () => {
    this.videoElement.play();
  }

  pause = () => {
    this.videoElement.pause();
  }

  navigate = (time: number) => {
    this.setState({currentTime: time});
    this.videoElement.currentTime = time;
  }

  setVolume = (volume: number) => {
    this.setState({volume});
    this.videoElement.volume = volume;
  }

  requestFullscreen = () => {
    const {sourceType} = this.props;
    if (sourceType === 'video') {
      requestFullScreen(this.videoElement as HTMLVideoElement);
    }
  }

  mute = () => {
    this.setVolume(0);
  }

  unmute = () => {
    // TODO: Set volume to previous value before mutting
    this.setVolume(0.5);
  }

  toggleMute = () => {
    const {volume} = this.videoState;

    if (volume > 0) {
      this.mute();
    } else {
      this.unmute();
    }
  }

  get actions(): VideoActions {
    const {play, pause, navigate, setVolume, requestFullscreen, mute, unmute, toggleMute} = this;

    return {
      play,
      pause,
      navigate,
      setVolume,
      requestFullscreen,
      mute,
      unmute,
      toggleMute
    };
  }

  savePlayableMediaRef = (element: any) => {
    if (!element) {return;}

    this.videoElement = element;
  }

  onDurationChange = (e: any) => {
    const video = e.target as SourceElement;
    
    this.setState({
      duration: video.duration
    });
  }

  onError = (e: any) => {
    const video = e.target as SourceElement;
    
    this.setState({
      isLoading: false,
      status: 'errored',
      error: video.error
    });
  }

  onWaiting = () => {
    this.setState({ isLoading: true });
  }

  render() {
    const {videoState, actions} = this;
    const {sourceType, src, children, autoPlay, controls, preload} = this.props;
    const TagName = sourceType || 'video'; // otherwise ts complains about not being able to create React component from TagName

    return children(
      <TagName
        ref={this.savePlayableMediaRef}
        src={src}
        preload={preload}
        controls={controls}
        autoPlay={autoPlay}
        onPlay={this.onPlay}
        onPause={this.onPause}
        onVolumeChange={this.onVolumeChange}
        onTimeUpdate={this.onTimeUpdate}
        onCanPlay={this.onCanPlay}
        onDurationChange={this.onDurationChange}
        onError={this.onError}
        onWaiting={this.onWaiting}
      />,
      videoState,
      actions      
    );
  }
}
