import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of as observableOf } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AppSettingsService } from '../app-settings/app-settings.service';
import * as Moment from 'moment';

/**
 * MOH 731 (Ver. July 2023).
 *
 * The report is computed a section at a time on the server, so a caller can ask
 * for the sections it is about to render rather than waiting on the whole form.
 */
@Injectable({
  providedIn: 'root'
})
export class Moh7312023ResourceService {
  constructor(
    public http: HttpClient,
    public appSettingsService: AppSettingsService
  ) {}

  private get url(): string {
    return (
      this.appSettingsService.getEtlRestbaseurl().trim() + 'MOH-731-2023-report'
    );
  }

  /**
   * @param sections Section numbers to compute, e.g. `['3']`. Omitted, the
   *                 server computes every section it implements.
   */
  public getReport(params: any, sections?: string[]): Observable<any> {
    let urlParams: HttpParams = new HttpParams()
      .set('startDate', Moment(params.startDate).format('YYYY-MM-DD'))
      .set('endDate', Moment(params.endDate).format('YYYY-MM-DD'))
      .set('isAggregated', params.isAggregated ? 'true' : 'false');

    if (params.locationUuids) {
      urlParams = urlParams.set('locationUuids', params.locationUuids);
    }

    if (sections && sections.length > 0) {
      urlParams = urlParams.set('sections', sections.join(','));
    }

    return this.http
      .get<any>(this.url, { params: urlParams })
      .pipe(
        map((response: any) => response),
        catchError((err: any) => {
          return observableOf({
            error: err.status,
            message: err.statusText
          });
        })
      );
  }

  /**
   * One page of the patients behind an indicator. The caller walks the pages
   * until one comes back short, so a large list arrives whole without asking
   * the server for it in a single request.
   */
  public getPatientList(
    params: any,
    indicator: string,
    startIndex: number,
    limit: number
  ): Observable<any> {
    // Only what has a value is sent: an empty parameter is not the same as an
    // absent one to the server's validation, and most indicators are not
    // filtered by sex at all.
    // Normalised here as well as by the caller: the query filters on an exact
    // date, so anything else reaching it silently matches nothing.
    let urlParams: HttpParams = new HttpParams()
      .set('startDate', Moment(params.startDate).format('YYYY-MM-DD'))
      .set('endDate', Moment(params.endDate).format('YYYY-MM-DD'))
      .set('isAggregated', params.isAggregated ? 'true' : 'false')
      .set('indicator', indicator)
      .set('startIndex', String(startIndex))
      .set('limit', String(limit));

    if (params.locationUuids) {
      urlParams = urlParams.set('locationUuids', params.locationUuids);
    }
    if (params.indicatorGender) {
      urlParams = urlParams.set('gender', params.indicatorGender);
    }

    return this.http
      .get<any>(
        this.appSettingsService.getEtlRestbaseurl().trim() +
          'MOH-731-2023-report/patient-list',
        { params: urlParams }
      )
      .pipe(
        map((response: any) => response),
        catchError((err: any) => {
          // The server's own message is kept: a bare status tells the user
          // nothing about which indicator or parameter it objected to.
          return observableOf({
            error: err.status,
            message:
              (err.error && (err.error.message || err.error.error)) ||
              err.statusText ||
              'Request failed'
          });
        })
      );
  }
}
