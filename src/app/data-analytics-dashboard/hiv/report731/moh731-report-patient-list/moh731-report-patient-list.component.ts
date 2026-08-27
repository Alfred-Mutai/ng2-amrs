import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { RegistersResourceService } from 'src/app/etl-api/registers-resource.service';
import { Moh7312023ResourceService } from 'src/app/etl-api/moh-731-2023-resource.service';
import { PatientListColumns } from 'src/app/shared/data-lists/patient-list/patient-list-columns.data';
import { LocationResourceService } from 'src/app/openmrs-api/location-resource.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-moh731-report-patient-list',
  templateUrl: './moh731-report-patient-list.component.html',
  styleUrls: ['./moh731-report-patient-list.component.css']
})
export class Moh731ReportPatientListComponent implements OnInit {
  /**
   * Patients are asked for a page at a time rather than all at once. The page
   * is large because the cost is in grouping the whole match set, not in the
   * rows returned: a second page costs about what the first did, so fewer,
   * bigger pages is the cheaper way round.
   */
  public static readonly PAGE_SIZE = 1000;

  /**
   * The PrEP boxes of section 1 are about clients who are HIV negative, so the
   * treatment columns this list normally carries - viral load, ARV regimen, TB
   * and cervical screening - are empty for every row. These are the columns the
   * PrEP monthly report's own list shows, kept in step with it deliberately so
   * the same client reads the same way in both places.
   */
  private static readonly PREP_COLUMNS = {
    phone_number: 'Phone',
    location: 'Location',
    enrollment_date: 'Date Enrolled',
    encounter_date: 'Encounter Date',
    last_appointment: 'Last Appointment',
    prev_rtc_date: 'Previous RTC Date',
    latest_rtc_date: 'RTC Date',
    days_since_rtc_date: 'Days missed since RTC',
    cur_prep_meds_names: 'Current prEp Regimen',
    initiation_reason: 'Reason for Initiation',
    hiv_rapid_test: 'HIV Rapid test result',
    rapid_test_date: 'HIV Rapid test date',
    population_type: 'Population Type',
    discontinue_reason: 'Reason for Discontinued',
    ovcid_id: 'OVCID',
    population_type_category: 'Population Type Category',
    nearest_center: 'Estate/Nearest Center'
  };

  public params: any;
  public patientData: any;
  public extraColumns: Array<any> = [];
  /**
   * Columns the grid shows by default that a PrEP client has no value for, so
   * they would read blank or "No CCC" on every row.
   */
  public hideColumns: Array<string> = [];
  /** Columns that belong at a set position rather than appended at the end. */
  public insertColumns: Array<any> = [];
  public isLoading = true;
  public overrideColumns: Array<any> = [];
  public selectedIndicator: string;
  public selectedIndicatorGender: string;
  public hasLoadedAll = false;
  public hasError = false;
  public errorMessage = '';
  /** The locations the figure behind this list was counted over. */
  public selectedLocationNames = '';
  /** Where the next page starts. */
  private nextStartIndex = 0;
  public selectedMonth: String;
  public busyIndicator: any = {
    busy: false,
    message: ''
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private _location: Location,
    public register: RegistersResourceService,
    private moh7312023: Moh7312023ResourceService,
    private locationResourceService: LocationResourceService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(
      (params) => {
        if (params && params.month) {
          this.params = params;
          this.selectedIndicator = params.indicatorHeader;
          this.selectedIndicatorGender = params.indicatorGender;
          this.resolveLocationNames(params.locationUuids);
          this.getPatientList(params, params.indicators);
        }
      },
      (error) => {
        console.error('Error', error);
      }
    );
    this.addExtraColumns();
  }

  /**
   * Names the locations the list covers. The url carries only uuids, and a list
   * read on its own says nothing about which facilities it came from. Named the
   * way the report names them, which is the way they are listed in the picker.
   */
  private resolveLocationNames(locationUuids: string) {
    const uuids = String(locationUuids || '')
      .split(',')
      .filter((uuid: string) => uuid.length > 0);
    if (uuids.length === 0) {
      return;
    }

    this.locationResourceService
      .getLocations()
      .pipe(take(1))
      .subscribe(
        (locations: any[]) => {
          const names = new Map<string, string>();
          (locations || []).forEach((location: any) => {
            names.set(location.uuid, location.display || location.name);
          });
          this.selectedLocationNames = uuids
            .map((uuid: string) => names.get(uuid))
            .filter((name: string) => !!name)
            .join(', ');
        },
        () => {
          // The list is still readable without them.
        }
      );
  }

  /**
   * Loads the first page and stops. Each page is a heavy query - the patient
   * columns come from a dozen joined tables - so fetching the whole list up
   * front makes the user wait on records they may never scroll to. The rest is
   * fetched only when asked for, by Load More.
   */
  private getPatientList(params: any, indicator: string) {
    this.patientData = [];
    this.nextStartIndex = 0;
    this.hasLoadedAll = false;
    this.hasError = false;
    this.isLoading = true;
    this.loadPage(params, indicator, 0);
  }

  private loadPage(params: any, indicator: string, startIndex: number) {
    const size = Moh731ReportPatientListComponent.PAGE_SIZE;
    const loaded = this.patientData ? this.patientData.length : 0;
    this.busyIndicator = {
      busy: true,
      message: loaded
        ? 'Loading the next ' + size + ' after ' + loaded + '...'
        : 'Loading Patient List...please wait'
    };

    this.moh7312023
      .getPatientList(params, indicator, startIndex, size)
      .subscribe(
        (data: any) => {
          const page =
            (data && data.results && data.results.results) ||
            (data && data.result) ||
            [];

          this.patientData = (this.patientData || []).concat(page);
          this.isLoading = false;

          if (data && data.error) {
            this.hasError = true;
            this.errorMessage =
              'Could not load the patient list for "' +
              indicator +
              '": ' +
              (data.message || data.error);
            console.error('MOH 731 patient list failed', indicator, data);
            this.stopLoading();
            return;
          }

          // A page shorter than the one asked for is the last one.
          this.nextStartIndex = startIndex + page.length;
          if (page.length < size) {
            this.hasLoadedAll = true;
          }
          this.stopLoading();
        },
        (err: any) => {
          this.hasError = true;
          this.errorMessage =
            'Could not load the patient list for "' + indicator + '".';
          console.error('MOH 731 patient list failed', indicator, err);
          this.isLoading = false;
          this.stopLoading();
        }
      );
  }

  private stopLoading() {
    this.busyIndicator = { busy: false, message: '' };
  }

  /** Whether the box being drilled into is one of the PrEP boxes. */
  private isPrepIndicator(): boolean {
    const indicator = (this.params && this.params.indicators) || '';
    return /^(prep_new_|prep_sti_|seroconverted_)/.test(String(indicator));
  }

  public addExtraColumns() {
    if (this.isPrepIndicator()) {
      this.hideColumns = ['ccc_number', 'upi_number'];
      this.insertColumns = [
        {
          after: 'age',
          column: {
            headerName: 'Date of Birth',
            width: 110,
            field: 'birthdate'
          }
        }
      ];
      this.addColumns(Moh731ReportPatientListComponent.PREP_COLUMNS);
      this.addOverrideColumns();
      return;
    }
    const extraColumns = {
      ccc_number: 'CCC Number',
      upi_number: 'UPI Number',
      weight: 'Weight',
      height: 'Height',
      stage: 'WHO Stage',
      location: 'Location',
      enrollment_date: 'Enrollment Date',
      arv_first_regimen_start_date: 'ARVs Initial Start Date',
      cur_regimen_arv_start_date: 'Current ARV Regimen Start Date (edited)',
      cur_arv_line: 'Current ARV Line (edited)',
      cur_arv_meds: 'Current ARV Regimen',
      has_pending_vl_test: 'Pending Viral Load Test',
      phone_number: 'Phone Number',
      last_appointment: 'Latest Appointment',
      patient_category: 'Patient Category',
      latest_rtc_date: 'Latest RTC Date',
      latest_vl: 'Latest VL',
      vl_category: 'VL Category',
      latest_vl_date: 'Latest VL Date',
      previous_vl: 'Previous VL',
      previous_vl_date: 'Previous VL Date',
      ipt_start_date: 'IPT Start Date',
      ipt_completion_date: 'IPT Completion Date',
      ipt_stop_date: 'IPT Stop Date',
      ovcid_id: 'OVCID',
      hiv_disclosure_status: 'Hiv Disclosure Status',
      discordant_status: 'Discordant Status',
      tb_screening_date: 'TB Screening Date',
      tb_screening_result: 'TB Screening Result',
      cervical_screening_date: 'Cervical Screening Date',
      cervical_screening_method: 'Cervical Screening Method',
      cervical_screening_result: 'Cervical Screening Result',
      sms_consent_provided: 'SMS Consent Provided',
      sms_receive_time: 'SMS Time',
      nearest_center: 'Nearest Center',
      patient_categorization: 'Patient Categorization',
      service_delivery_model: 'Service Model',
      dsd_model: 'DSD Model',
      cd4_1: 'CD4',
      cd4_lateral_flow: 'CD4 Lateral Flow',
      cd4_date: 'CD4 Date'
    };

    // An indicator that is not split by sex carries no gender, and the router
    // drops the empty parameter, so this arrives undefined. Reading it without
    // guarding threw before any column was added, leaving the list with only
    // the grid's own columns and every added one blank.
    const status = (this.selectedIndicatorGender || '').split(' - ')[0];
    if (status === 'Died') {
      Object.assign(extraColumns, {
        death_date: 'Death Date',
        cause_of_death: 'Cause of Death'
      });
    } else if (status === 'Transferred Out') {
      Object.assign(extraColumns, {
        transfer_out_date_v1: 'Transfer out date'
      });
    }
    // The grid appends these to its own standard columns, so anything it
    // already shows would appear twice. Its version is kept: it carries the
    // widths and cell renderers this list would otherwise lose.
    this.addColumns(extraColumns);
    this.addOverrideColumns();
  }

  /**
   * Appends a set of columns to the grid's own, skipping any the grid already
   * shows: its version carries the widths and cell renderers this list would
   * otherwise lose, and a duplicate would render the column twice.
   */
  private addColumns(columns: { [field: string]: string }) {
    const alreadyShown = new Set(
      PatientListColumns.columns()
        .map((column: any) => column.field)
        .filter((field: any) => !!field)
    );

    for (const indicator in columns) {
      if (indicator && !alreadyShown.has(indicator)) {
        this.extraColumns.push({
          headerName: columns[indicator],
          field: indicator
        });
      }
    }
  }

  private addOverrideColumns() {
    this.overrideColumns.push(
      {
        field: 'identifiers',
        cellRenderer: (column) => {
          return (
            '<a href="javascript:void(0);" title="Identifiers">' +
            column.value +
            '</a>'
          );
        }
      },
      {
        field: 'last_appointment',
        width: 200
      },
      {
        field: 'cur_prep_meds_names',
        width: 160
      }
    );
  }

  /** Fetches the next page and adds it to what is already on screen. */
  public loadMorePatients() {
    if (this.hasLoadedAll || this.busyIndicator.busy) {
      return;
    }
    this.isLoading = true;
    this.loadPage(this.params, this.params.indicators, this.nextStartIndex);
  }

  public goBack() {
    this._location.back();
  }
}
