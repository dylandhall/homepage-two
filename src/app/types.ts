

export interface IBookmarksFile{
  roots: IRoots;
}
export interface IRoots {
  bookmark_bar: IBookmarkBar;
}
export interface IBookmarkBar{
  children: IBookmark[];
}
export interface IBookmark{
  url: string;
  name: string;
  iconUrl: string;
}
type KnownIconRecord = Record<string, string>;

export interface IConfig {
  rssSources: IRssSource[] | null;
  knownIcons: KnownIconRecord | null;
  weatherApiKey: string | null;
  location: Point | null;
  googleApi: IGoogleApi | null;
  githubQuery: IGithubQuery | null;
  rssApiKey: string | null;
}

export interface IWallpaper {
  description: string | null;
}
export interface IGoogleApi{
  clientSecret:string;
  clientId:string;
}
export interface ILocation{
  lat:number;
  long:number;
}

export interface IGithubQuery{
  githubToken: string | null;
  owner:string;
  repo:string;
  username:string;
}
export interface IRssSource{
  weight:number;
  url:string;
}

export interface ApiResponse {
  status: string;
  feed: Feed | null;
  items: Item[];
}

export interface Feed {
  url: string;
  title: string;
  link: string;
  author: string;
  description: string;
  image: string;
}

export interface Item {
  title: string;
  pubDate: string;
  link: string;
  guid: string;
  author: string;
  thumbnail: string;
  description: string;
  content: string;
  enclosure: Enclosure | null;
}

export interface ItemWithFeed extends Item{
  feed: Feed;
}

export interface Enclosure {
  link: string;
  type: string,
  "thumbnail": string;
}

export interface Point {
  lat: number;
  lon: number;
}
export interface WeatherApiResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  offset: number;
  elevation: number;
  currently: CurrentWeather;
  minutely: MinutelyForecast;
  hourly: HourlyForecast;
  daily: DailyForecast;
  alerts: Alert[];
  flags: Flags;
}

export interface CurrentWeather {
  time: number;
  summary: string;
  icon: string;
  nearestStormDistance: number;
  nearestStormBearing: number;
  precipIntensity: number;
  precipProbability: number;
  precipIntensityError: number;
  precipType: string;
  temperature: number;
  apparentTemperature: number;
  dewPoint: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust: number;
  windBearing: number;
  cloudCover: number;
  uvIndex: number;
  visibility: number;
  ozone: number;
}

export interface MinutelyForecast {
  summary: string;
  icon: string;
  data: MinutelyData[];
}

export interface MinutelyData {
  time: number;
  precipIntensity: number;
  precipProbability: number;
  precipIntensityError: number;
  precipType: string;
}

export interface HourlyForecast {
  summary: string;
  icon: string;
  data: HourlyData[];
}

export interface HourlyData {
  time: number;
  icon: string;
  summary: string;
  precipIntensity: number;
  precipProbability: number;
  precipIntensityError: number;
  precipAccumulation: number;
  precipType: string;
  temperature: number;
  apparentTemperature: number;
  dewPoint: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust: number;
  windBearing: number;
  cloudCover: number;
  uvIndex: number;
  visibility: number;
  ozone: number;
}

export interface DailyForecast {
  summary: string;
  icon: string;
  data: DailyData[];
}

export interface DailyData {
  time: number;
  icon: string;
  summary: string;
  sunriseTime: number;
  sunsetTime: number;
  moonPhase: number;
  precipIntensity: number;
  precipIntensityMax: number;
  precipIntensityMaxTime: number;
  precipProbability: number;
  precipAccumulation: number;
  precipType: string;
  temperatureHigh: number;
  temperatureHighTime: number;
  temperatureLow: number;
  temperatureLowTime: number;
  apparentTemperatureHigh: number;
  apparentTemperatureHighTime: number;
  apparentTemperatureLow: number;
  apparentTemperatureLowTime: number;
  dewPoint: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust: number;
  windGustTime: number;
  windBearing: number;
  cloudCover: number;
  uvIndex: number;
  uvIndexTime: number;
  visibility: number;
  temperatureMin: number;
  temperatureMinTime: number;
  temperatureMax: number;
  temperatureMaxTime: number;
  apparentTemperatureMin: number;
  apparentTemperatureMinTime: number;
  apparentTemperatureMax: number;
  apparentTemperatureMaxTime: number;
}

export interface Alert {
  title: string;
  regions: string[];
  severity: string;
  time: number;
  expires: number;
  description: string;
  uri: string;
}

export interface Flags {
  sources: string[];
  sourceTimes: SourceTimes;
  nearestStation: number;
  units: string;
  version: string;
}

export interface SourceTimes {
  hrrr_0_18: string;
  hrrr_subh: string;
  hrrr_18_48: string;
  gfs: string;
  gefs: string;
}
export type WeatherIconMap = Record<string, string>;
export const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const oneHour = 60 * 60 * 1000;
export const twelveHours = 12 * oneHour;
