import * as Moment from 'moment';
import * as _ from 'lodash';
import {
  Component,
  ElementRef,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegistersResourceService } from 'src/app/etl-api/registers-resource.service';
import { DatePipe } from '@angular/common';
import { DataAnalyticsDashboardService } from '../../services/data-analytics-dashboard.services';

import * as html2canvas from 'html2canvas';
import * as jsPDF from 'jspdf';

import {
  Moh731Block,
  Moh731Cell,
  Moh731Row,
  MOH_731_SECTIONS,
  buildMoh731SectionDefs
} from './moh-731-form-definition';

@Component({
  selector: 'app-report731',
  templateUrl: './report731.component.html',
  styleUrls: ['./report731.component.css']
})
export class Report731Component implements OnInit {
  @Output()
  public params: any;
  public indicators: string;
  public selectedIndicators = [];
  public MOH731RegisterData: any = {};
  public columnDefs: any = [];
  public reportName = 'MOH 731 REPORT';
  public currentView = 'report';
  public month: string;
  public year: number;
  public quarter: string;
  public eDate: string;
  public sDate: string;
  public jointLocationUuids = [];

  public statusError = false;
  public errorMessage = '';
  public showInfoMessage = false;
  public isLoading = false;
  public reportHead: any;
  public enabledControls = 'monthControl, locationControl';
  public pinnedBottomRowData: any = [];
  public _month: string;
  public showLocationsControl = true;
  public showIsAggregateControl = true;
  public isAggregated = false;
  public isReleased = false;
  public generated = false;

  /** Layout of the paper form, shared by the report view and the tabular view. */
  public sections = MOH_731_SECTIONS;
  /** Column groups of the tabular view. */
  public sectionDefs: Array<any> = buildMoh731SectionDefs();
  /** One row per location returned by the ETL, or one aggregated row. */
  public rowData: Array<any> = [];
  /** One rendering of the paper form per row of `rowData`. */
  public formSheets: Array<any> = [];
  public selectedLocationNames = '';

  @ViewChild('reportContent') public contentToSnapshot!: ElementRef;

  public _locationUuids: any = [];
  public get locationUuids(): Array<string> {
    return this._locationUuids;
  }

  public set locationUuids(v: Array<string>) {
    const locationUuids = [];
    _.each(v, (location: any) => {
      if (location.value) {
        locationUuids.push(location);
      }
    });
    this._locationUuids = locationUuids;
  }

  private _startDate: Date = Moment()
    .subtract(1, 'months')
    .startOf('month')
    .toDate();
  public get startDate(): Date {
    return this._startDate;
  }

  public set startDate(v: Date) {
    this._startDate = v;
  }

  private _endDate: Date = Moment()
    .subtract(1, 'months')
    .endOf('month')
    .toDate();
  public get endDate(): Date {
    return this._endDate;
  }

  public set endDate(v: Date) {
    this._endDate = v;
  }

  /** Locations selected on the dashboard, kept in sync with the filter. */
  private dashboardLocations: Array<any> = [];

  constructor(
    public router: Router,
    public route: ActivatedRoute,
    public register: RegistersResourceService,
    private datePipe: DatePipe,
    private dataAnalyticsDashboardService: DataAnalyticsDashboardService
  ) {
    this.route.queryParams.subscribe((data) => {
      data.month === undefined
        ? (this._month = Moment().subtract(1, 'month').format('YYYY-MM-DD'))
        : (this._month = data.month);

      this.showDraftReportAlert(this._month);
    });
  }

  ngOnInit() {
    this.dataAnalyticsDashboardService
      .getSelectedLocations()
      .subscribe((data) => {
        this.dashboardLocations = (data && data.locations) || [];
      });
  }

  public onMonthChange(value): any {
    this._month = Moment(value).format('YYYY-MM-DD');
  }

  public onTabChanged(event: any) {
    this.currentView = event && event.index === 1 ? 'tabular' : 'report';
  }

  public generateReport(): any {
    this.route.parent.parent.params.subscribe((params: any) => {
      this.storeParamsInUrl();
    });
    this.MOH731RegisterData = {};
    this.rowData = [];
    this.formSheets = [];
    this.pinnedBottomRowData = [];
    this.getMOH731Register(this.params);
    this.generated = true;
  }

  public storeParamsInUrl() {
    this.selectedLocationNames = this.getSelectedLocationNames();
    this._month = Moment(this.startDate).format('YYYY-MM-DD');
    this.showDraftReportAlert(this._month);
    this.params = {
      locationUuids: this.getSelectedLocations(),
      isAggregated: this.isAggregated,
      month: this._month,
      startDate: Moment(this.startDate).format('YYYY-MM-DD'),
      endDate: Moment(this.endDate).format('YYYY-MM-DD')
    };
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.params
    });
  }

  public getMOH731Register(params: any) {
    this.isLoading = true;
    this.register.getMoh731Register(params).subscribe((data) => {
      if (data.error) {
        this.showInfoMessage = true;
        this.errorMessage = `There has been an error while loading the report, please retry again`;
        this.isLoading = false;
      } else {
        this.showInfoMessage = false;
        // The ETL may ship its own section definitions. Fall back to the ones
        // derived from the paper form when it does not.
        if (
          data.sectionDefinitions &&
          data.sectionDefinitions.length > 0 &&
          data.sectionDefinitions[0].indicators
        ) {
          this.columnDefs = data.sectionDefinitions;
          this.sectionDefs = data.sectionDefinitions;
        }
        const result = data.result || [];
        this.rowData = this.buildRowData(result);
        this.formSheets = this.buildFormSheets(this.rowData);
        this.MOH731RegisterData = this.formSheets.length
          ? this.formSheets[0].data
          : {};
        this.calculateTotalSummary();
        this.isLoading = false;
        this.showDraftReportAlert(this._month);
      }
    });
  }

  /**
   * The ETL returns either a row per location or a set of partial rows that
   * together make up a single aggregate. Anything without its own location is
   * merged into the one row the form view displays.
   */
  private buildRowData(result: Array<any>): Array<any> {
    const perLocation = (result || []).filter(
      (row: any) => row && (row.location || row.location_uuid)
    );

    if (perLocation.length > 0) {
      return this.isAggregated
        ? [this.aggregateRows(perLocation)]
        : perLocation;
    }

    if (!result || result.length === 0) {
      return [];
    }

    return [
      Object.assign({}, ...result, {
        location: this.selectedLocationNames || 'All selected locations'
      })
    ];
  }

  /** Sums every numeric indicator of the given rows into a single row. */
  private aggregateRows(rows: Array<any>): any {
    const aggregate: any = {
      location: this.selectedLocationNames || 'All selected locations'
    };

    rows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        const value = this.toNumber(row[key]);
        if (value !== null) {
          aggregate[key] = (aggregate[key] || 0) + value;
        }
      });
    });

    return aggregate;
  }

  /** Indicator values the ETL may ship as numbers or as numeric strings. */
  private toNumber(value: any): number | null {
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }
    if (typeof value === 'string' && value.trim() !== '' && !isNaN(+value)) {
      return +value;
    }
    return null;
  }

  /**
   * One sheet of the paper form per row: a single combined sheet when the
   * locations are aggregated, otherwise one sheet per location.
   */
  private buildFormSheets(rows: Array<any>): Array<any> {
    return (rows || []).map((row: any) => ({
      locationName: row.location || this.selectedLocationNames,
      locationUuid: row.location_uuid || null,
      data: row
    }));
  }

  public calculateTotalSummary() {
    if (this.rowData.length < 2) {
      this.pinnedBottomRowData = [];
      return;
    }

    const totalObj: any = { location: 'Totals' };
    _.each(this.rowData, (row) => {
      Object.keys(row).forEach((key) => {
        const value = this.toNumber(row[key]);
        if (value !== null) {
          totalObj[key] = (totalObj[key] || 0) + value;
        }
      });
    });

    this.pinnedBottomRowData = [totalObj];
  }

  /** Width the printed form gives a column, as a percentage of the sheet. */
  public columnWidth(section: any, columnIndex: number): number {
    if (section.columnWidths && section.columnWidths[columnIndex]) {
      return section.columnWidths[columnIndex];
    }
    return 100 / section.columns.length;
  }

  public cellValue(sheet: any, cell: Moh731Cell): any {
    if (!cell || !cell.field || !sheet || !sheet.data) {
      return '';
    }
    const value = sheet.data[cell.field];
    return value === null || value === undefined ? '' : value;
  }

  public onCellSelected(
    sheet: any,
    block: Moh731Block,
    row: Moh731Row,
    cell: Moh731Cell
  ) {
    if (!cell || !cell.field) {
      return;
    }
    const title = block.indicatorGroup || block.title || row.label;
    this.onIndicatorSelected(
      title,
      cell.field,
      cell.gender || '',
      sheet ? sheet.locationUuid : null
    );
  }

  public onGridIndicatorSelected(selected: any) {
    if (!selected || !selected.indicator) {
      return;
    }
    this.onIndicatorSelected(
      selected.title,
      selected.indicator,
      selected.gender || '',
      selected.location
    );
  }

  public onIndicatorSelected(
    title: string,
    indicator: string,
    gender: string,
    locationUuid?: string
  ) {
    // An indicator read off one location's sheet drills into that location
    // only. Aggregated numbers cover every location that was selected.
    const locationUuids =
      !this.isAggregated && locationUuid
        ? locationUuid
        : this.getSelectedLocations();

    this.router.navigate(['patient-list'], {
      relativeTo: this.route,
      queryParams: {
        indicators: indicator,
        indicatorHeader: title,
        month: this._month,
        locationUuids: locationUuids,
        indicatorGender: gender,
        startDate: this.startDate,
        endDate: this.endDate
      }
    });
  }

  public showDraftReportAlert(date) {
    if (date != null && date >= Moment().format('YYYY-MM-DD')) {
      this.isReleased = false;
    } else {
      this.isReleased = true;
    }
  }

  transformDate(date: string): string | null {
    return this.datePipe.transform(date, 'dd/MM/yyyy');
  }

  public takeSnapshotAndExport() {
    const elementToSnapshot = this.contentToSnapshot.nativeElement;
    // The form is wider than the page whenever a section needs the room, so
    // snapshot its full scroll width rather than the slice that is on screen.
    const width = Math.max(
      elementToSnapshot.scrollWidth,
      elementToSnapshot.offsetWidth
    );

    html2canvas(elementToSnapshot, {
      width: width,
      windowWidth: width,
      scrollX: 0,
      scrollY: 0
    }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297; // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save('MOH 731 Register.pdf');
    });
  }

  /** Locations picked in the filter, falling back to the dashboard selection. */
  private getSelectedLocationObjects(): Array<any> {
    const selected =
      this.jointLocationUuids && this.jointLocationUuids.length > 0
        ? this.jointLocationUuids
        : this.dashboardLocations;
    return selected || [];
  }

  private getSelectedLocations(): string {
    const uuids = this.getSelectedLocationObjects()
      .map((location: any) => (location && location.value) || location)
      .filter((uuid: any) => typeof uuid === 'string' && uuid.length > 0);
    return _.uniq(uuids).join(',');
  }

  private getSelectedLocationNames(): string {
    const names = this.getSelectedLocationObjects()
      .map((location: any) => location && location.label)
      .filter((label: any) => typeof label === 'string' && label.length > 0);
    return _.uniq(names).join(', ');
  }
}
