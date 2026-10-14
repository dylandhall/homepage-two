import {
  inject,
  Injectable
} from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';
import {
  catchError,
  EMPTY,
  filter,
  from,
  map,
  mergeMap,
  Observable,
  of,
  scan,
  switchMap,
  throwError,
} from 'rxjs';
import {
  AuthService,
  LoginRequiredError
} from './auth-service';

const isUnauthorised = (err: unknown) => err instanceof HttpErrorResponse && err.status === 401;

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {
  private listApiUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer';
  private apiUrl = 'https://www.googleapis.com/calendar/v3/calendars';

  constructor(private http: HttpClient, private authService: AuthService) { }

  // Events in the next 48 hours from the calendars you own or can edit. onLoginRequired is only called when
  // there's no way to get an access token without logging in again; any other failure emits nothing, so the
  // cached events stay on screen and the next poll tries again with the same tokens.
  public fetchEvents(onLoginRequired: () => void): Observable<IEvent[]> {
    return this.authService.getAccessToken().pipe(
      switchMap(token => this.fetchEventsWithToken(token)),
      // Google can stop accepting an access token before it expires, so get a new one and try once more
      catchError(err => isUnauthorised(err)
        ? this.authService.getAccessToken(true).pipe(switchMap(token => this.fetchEventsWithToken(token)))
        : throwError(() => err)),
      catchError(err => {
        if (err instanceof LoginRequiredError) onLoginRequired();
        else console.warn('Could not load calendar events, trying again on the next poll', err);
        return EMPTY;
      }),
    );
  }

  private fetchEventsWithToken(token: string): Observable<IEvent[]> {
    const headers = { 'Authorization': `Bearer ${token}` };
    const now = new Date();
    const fortyEightHours = 48 * 60 * 60 * 1000;

    const timeMax = new Date(now.getTime() + fortyEightHours);
    return this.http.get<ICalendars>(this.listApiUrl, {headers}).pipe(
      filter(v => v?.items?.length > 0),
      switchMap(r =>
        from(r.items.filter(i => i.accessRole === 'owner' || i.summary.indexOf('@') === -1)).pipe(
          mergeMap(c =>
            this.http.get<IEvents>(`${this.apiUrl}/${encodeURIComponent(c.id)}/events?timeMin=${now.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true`, {headers}).pipe(
              // skip a calendar that won't load, unless it's the token that's the problem
              catchError(err => isUnauthorised(err) ? throwError(() => err) : of({} as IEvents)),
              filter(v => v?.items?.length>0),
              map(v => v.items),
            )
          ),
          scan((acc, result) => ([...acc, ...result]), <IEvent[]>[]),
          map(v => {
            v.sort((a,b) => ((a.start?.dateTime??a.start?.date??'')?.localeCompare(b.start?.dateTime??b.start?.date??''))??0);
            return v;
          })
        )
      )
    );
  }
}

export interface ICalendars{
  "kind": "calendar#calendarList",
  "etag": string,
  "nextPageToken": string,
  "nextSyncToken": string,
  "items": ICalendar[]
}
export interface ICalendar {
  "kind": "calendar#calendarListEntry",
  "etag": string,
  "id": string,
  "summary": string,
  "description": string,
  "location": string,
  "timeZone": string,
  "summaryOverride": string,
  "colorId": string,
  "backgroundColor": string,
  "foregroundColor": string,
  "hidden": boolean,
  "selected": boolean,
  "accessRole": string,
  "defaultReminders": [
    {
      "method": string,
      "minutes": number
    }
  ],
  "notificationSettings": {
    "notifications": [
      {
        "type": string,
        "method": string
      }
    ]
  },
  "primary": boolean,
  "deleted": boolean,
  "conferenceProperties": {
    "allowedConferenceSolutionTypes": [
      string
    ]
  }
}
export interface IEvents
{
  "kind": "calendar#events",
  "etag": string,
  "summary": string,
  "description": string,
  "updated": string,//datetime,
  "timeZone": string,
  "accessRole": string,
  "defaultReminders": [
    {
      "method": string,
      "minutes": number
    }
  ],
  "nextPageToken": string,
  "nextSyncToken": string,
  "items": IEvent[]
}
export interface IEvent
{
  "kind": "calendar#event",
  "etag": string,
  "id": string,
  "status": string,
  "htmlLink": string,
  "created": string,
  "updated": string,
  "summary": string,
  "description": string,
  "location": string,
  "colorId": string,
  "creator": {
    "id": string,
    "email": string,
    "displayName": string,
    "self": boolean
  },
  "organizer": {
    "id": string,
    "email": string,
    "displayName": string,
    "self": boolean
  },
  "start": {
    "date": string | null,
    "dateTime": string | null,
    "timeZone": string
  },
  "end": {
    "date": string,
    "dateTime": string,
    "timeZone": string
  },
  "endTimeUnspecified": boolean,
  "recurrence": [
    string
  ],
  "recurringEventId": string,
  "originalStartTime": {
    "date": Date,
    "dateTime": Date,
    "timeZone": string
  },
  "transparency": string,
  "visibility": string,
  "iCalUID": string,
  "sequence": number,
  "attendees": [
    {
      "id": string,
      "email": string,
      "displayName": string,
      "organizer": boolean,
      "self": boolean,
      "resource": boolean,
      "optional": boolean,
      "responseStatus": string,
      "comment": string,
      "additionalGuests": number
    }
  ],
  "attendeesOmitted": boolean,
  "extendedProperties": {
    "private": {
      (key:string): string
    },
    "shared": {
      (key:string): string
    }
  },
  "hangoutLink": string,
  "conferenceData": {
    "createRequest": {
      "requestId": string,
      "conferenceSolutionKey": {
        "type": string
      },
      "status": {
        "statusCode": string
      }
    },
    "entryPoints": [
      {
        "entryPointType": string,
        "uri": string,
        "label": string,
        "pin": string,
        "accessCode": string,
        "meetingCode": string,
        "passcode": string,
        "password": string
      }
    ],
    "conferenceSolution": {
      "key": {
        "type": string
      },
      "name": string,
      "iconUri": string
    },
    "conferenceId": string,
    "signature": string,
    "notes": string,
  },
  "gadget": {
    "type": string,
    "title": string,
    "link": string,
    "iconLink": string,
    "width": number,
    "height": number,
    "display": string,
    "preferences": {
      (key:string): string
    }
  },
  "anyoneCanAddSelf": boolean,
  "guestsCanInviteOthers": boolean,
  "guestsCanModify": boolean,
  "guestsCanSeeOtherGuests": boolean,
  "privateCopy": boolean,
  "locked": boolean,
  "reminders": {
    "useDefault": boolean,
    "overrides": [
      {
        "method": string,
        "minutes": number
      }
    ]
  },
  "source": {
    "url": string,
    "title": string
  },
  "workingLocationProperties": {
    "type": string,
    "homeOffice": boolean,
    "customLocation": {
      "label": string
    },
    "officeLocation": {
      "buildingId": string,
      "floorId": string,
      "floorSectionId": string,
      "deskId": string,
      "label": string
    }
  },
  "attachments": [
    {
      "fileUrl": string,
      "title": string,
      "mimeType": string,
      "iconLink": string,
      "fileId": string
    }
  ],
  "eventType": string
}
