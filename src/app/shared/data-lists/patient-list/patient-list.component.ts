import { Component, OnInit, Input } from '@angular/core';
import { PatientListColumns } from './patient-list-columns.data';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
const _ = require('lodash');

@Component({
  selector: 'patient-list',
  templateUrl: './patient-list.component.html'
})
export class PatientListComponent implements OnInit {
  @Input() public extraColumns: any;
  @Input() public overrideColumns: any;
  @Input() public data: any = [];
  @Input() public newList: any;
  @Input() public excludecolumns: boolean;
  /**
   * Fields to drop from the grid's own standard columns, for a list where they
   * can only ever be blank. Unlike excludecolumns, which hides one fixed pair,
   * the caller names the fields.
   */
  @Input() public hideColumns: Array<string> = [];
  /**
   * Columns to place at a chosen point rather than at the end. extraColumns are
   * appended after the grid's own, so a column that belongs beside a standard
   * one - a date of birth next to the age - cannot be positioned any other way.
   * Each entry is { after: <field>, column: <column def> }; an entry naming a
   * field the grid does not show falls back to being appended.
   */
  @Input() public insertColumns: Array<any> = [];
  public loadedTab: any;
  @Input()
  set options(value) {
    this._data.next(value);
  }
  get options() {
    return this._data.getValue();
  }
  @Input()
  set dataSource(value) {
    this._dataSource.next(value);
  }
  get dataSource() {
    return this._dataSource.getValue();
  }
  @Input() public hivColumns = false;
  private _data = new BehaviorSubject<any>([]);
  private _dataSource = new BehaviorSubject<any>({});
  constructor(private router: Router) {}

  public ngOnInit() {
    this._data.subscribe((x) => {
      this.loadedTab = x;
    });
  }

  get columns() {
    let columns = PatientListColumns.columns();
    if (this.extraColumns && typeof Array.isArray(this.extraColumns)) {
      columns = _.concat(columns, this.extraColumns as Array<object>);
    }

    if (this.overrideColumns && _.isArray(this.overrideColumns)) {
      _.each(this.overrideColumns, (col) => {
        _.each(columns, (_col) => {
          if (col['field'] === _col['field']) {
            _.extend(_col, col);
          }
        });
      });
    }
    if (this.hivColumns) {
      const loadHivColumns = PatientListColumns.hivColumns();
      columns = _.concat(columns, loadHivColumns as Array<object>);
    }

    if (this.excludecolumns) {
      const columnsToExclude = ['previous_vl', 'previous_vl_date'];
      columns = _.filter(columns, (col) => {
        return !_.includes(columnsToExclude, col['field']);
      });
    }

    if (_.isArray(this.hideColumns) && this.hideColumns.length > 0) {
      columns = _.filter(columns, (col) => {
        return !_.includes(this.hideColumns, col['field']);
      });
    }

    if (_.isArray(this.insertColumns)) {
      _.each(this.insertColumns, (entry) => {
        if (!entry || !entry.column) {
          return;
        }
        const at = _.findIndex(columns, (col) => col['field'] === entry.after);
        if (at === -1) {
          columns.push(entry.column);
        } else {
          columns.splice(at + 1, 0, entry.column);
        }
      });
    }
    return columns;
  }

  get rowData() {
    const d: any = this.data || [];
    let count = 1;
    _.forEach(d, (row) => {
      if (!row['person_name']) {
        row['person_name'] =
          row['given_name'] +
          ' ' +
          row['family_name'] +
          ' ' +
          row['middle_name'];
      }
      count++;
    });
    return this.data || [];
  }

  public loadSelectedPatient(event: any) {
    let patientUuid = '';
    if (event) {
      patientUuid = event.node.data.uuid;
    }

    if (patientUuid === undefined || patientUuid === null) {
      return;
    }

    this.router.navigate([
      '/patient-dashboard/patient/' +
        patientUuid +
        '/general/general/landing-page'
    ]);
  }
}
