import { Pipe, PipeTransform } from '@angular/core';
import * as Moment from 'moment';

/**
 * Formats a date for display as "Monday, 3rd August 2026".
 *
 * Angular's DatePipe has no ordinal token, so moment's `Do` is used instead. It
 * handles the 11th/12th/13th exceptions to the st/nd/rd pattern.
 */
@Pipe({ name: 'ordinalDate' })
export class OrdinalDatePipe implements PipeTransform {
  public transform(value: any): string {
    // moment(undefined) resolves to "now", so an absent date would silently
    // render as today. Guard before parsing.
    if (value === null || value === undefined || value === '') {
      return '';
    }

    const date = Moment(value);

    return date.isValid() ? date.format('dddd, Do MMMM YYYY') : '';
  }
}
