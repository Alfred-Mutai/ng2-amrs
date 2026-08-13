import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild
} from '@angular/core';
import { AgGridNg2 } from 'ag-grid-angular';

/**
 * Tabular view of the MOH 731 report. Built the same way as the grid on the
 * older MOH 731 report: one column group per sub section of the form, one
 * column per indicator, and a cell click drills into the patient list.
 */
@Component({
  selector: 'app-moh731-tabular',
  templateUrl: './moh731-tabular.component.html',
  styleUrls: ['./moh731-tabular.component.css']
})
export class Moh731TabularViewComponent {
  public gridOptions: any = {
    columnDefs: [],
    enableSorting: true,
    enableFilter: true,
    enableColResize: true,
    suppressCellSelection: false,
    rowSelection: 'single',
    // Indicator labels carry their HV code, so columns are sized to their
    // header rather than clipped to a fixed width.
    autoSizePadding: 12,
    onGridReady: () => this.autoSizeColumns(),
    onRowDataChanged: () => this.autoSizeColumns()
  };

  public quickFilterText = '';

  @Output() public indicatorSelected = new EventEmitter<any>();

  // tslint:disable-next-line:no-input-rename
  @Input('rowData')
  public data: Array<any> = [];

  @Input() public pinnedBottomRowData: Array<any> = [];

  @Input() public isReleased: boolean;

  @ViewChild('agGrid')
  public agGrid: AgGridNg2;

  private _sectionDefs: Array<any> = [];
  public get sectionDefs(): Array<any> {
    return this._sectionDefs;
  }
  @Input('sectionDefs')
  public set sectionDefs(v: Array<any>) {
    this._sectionDefs = v || [];
    this.setColumns(this._sectionDefs);
  }

  public setColumns(sectionsData: Array<any>) {
    const defs: Array<any> = [
      {
        headerName: 'Location',
        field: 'location',
        pinned: 'left',
        minWidth: 200
      }
    ];

    (sectionsData || []).forEach((section) => {
      const group: any = {
        headerName: section.sectionTitle,
        headerTooltip: section.sectionTitle,
        children: []
      };
      (section.indicators || []).forEach((indicator) => {
        group.children.push({
          headerName: indicator.label,
          headerTooltip: indicator.label,
          field: indicator.indicator,
          minWidth: 90,
          indicatorTitle: indicator.title || section.sectionTitle,
          indicatorGender: indicator.gender || ''
        });
      });
      if (group.children.length > 0) {
        defs.push(group);
      }
    });

    this.gridOptions.columnDefs = defs;
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.setColumnDefs(defs);
    }
    this.autoSizeColumns();
  }

  /** Widens every column to fit its header and values, never clipping either. */
  public autoSizeColumns() {
    if (!this.agGrid || !this.agGrid.columnApi) {
      return;
    }
    // Runs after the grid has laid out the columns it was just given.
    setTimeout(() => {
      if (this.agGrid && this.agGrid.columnApi) {
        this.agGrid.columnApi.autoSizeAllColumns('api');
      }
    });
  }

  public onCellClicked(event: any) {
    if (
      !event.colDef ||
      !event.colDef.field ||
      event.colDef.field === 'location'
    ) {
      return;
    }
    this.indicatorSelected.emit({
      indicator: event.colDef.field,
      title: event.colDef.indicatorTitle || event.colDef.headerName,
      gender: event.colDef.indicatorGender || '',
      value: event.value,
      location: event.data ? event.data.location_uuid : null
    });
  }

  public exportToCsv() {
    if (this.agGrid && this.agGrid.api) {
      this.agGrid.api.exportDataAsCsv({
        fileName: 'moh-731-report.csv'
      });
    }
  }
}
