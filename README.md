# HMPPS DPR Data Product Definition JSON Schema

This repository hosts the DPD JSON Schema.

A Data Production Definition (DPD) describes where to find and how to display data for a data product.

# DPD sections

## datasource

The datasource section shows where a dataset should source its data from. This could be the DPR RedShift (AKA `datamart`), NOMIS, or other data source.

The datasource also contains the database to connect to.

## dataset

Each DPD contains at least one dataset, often several.

A dataset consists of:
- **datasource**: As above - the location of the data.
- **query**: A SQL query to run to retrieve the data.
- **schema/fields**: A list of columns to be returned by the query - their type and default names. Many of these properties can be overridden by report-specific values.
  - **name**: The name of the field/column in the SQL query.
  - **display**: The name of the field to display in the report and in the filters, if filtered (e.g. `First name`).
  - **filter**: See "Filters" in the "Notable Features" section below.
  - **type**: The data type of the field. Used for deciding cell alignment and default transforms (e.g. rendering dates).
- **parameters**: A list of filters to be applied within the query - distinct from field filters in the report, as these are a legacy of reports migrated from Business Objects.  
- **schedule**: A CRON tab expression representing the regular schedule to generate the report.

There are three types of dataset:
- Standard dataset: Used for retrieving data to be displayed in a report.
  - Can be Oracle SQL if  NOMIS datasource is used, otherwise RedShift Postgres-like SQL.
- Summary dataset: Used for retrieving data to be displayed in a single summary section of a report.
  - Always RedShift SQL.
  - Contains a ${tableId} token denoting the name of the table containing the results of the Standard DataSet.
  - See "Summaries" in the "Notable Features" section below.
- Filter Option dataset: Used for retrieving filter options for reports.
  - For example a report may have an `Establishment` filter, which could use a caseload-limited list of establishments queried from the establishments table.
  - See "Filters" in the "Notable Features" section below.

## policy

The policy section contains a series of rules to be applied to the dataset results. This could be a simple "permit" to people with the correct role, or often a filter based on the user's active caseload. This is applied as a part of the SQL query as a Common Table Expression.

By default, no rows will be shown - access needs to be explicitly permitted.

Example of granting access by role:
```json
"policy": [
    {
      "id": "access",
      "type": "access",
      "rule": [
        {
          "effect": "permit",
          "condition": [
            {
              "match": ["${role}", "ROLE_PRISONS_REPORTING_USER"]
            }
          ]
        }
      ]
    }
  ],
```

Example of granting access by caseload:
```json
"policy": [
    {
      "id": "caseload",
      "type": "row-level",
      "action": ["establishment_code='${caseload}'"],
      "rule": [
        {
          "effect": "permit",
          "condition": [
            {
              "exists": ["${caseload}"]
            }
          ]
        }
      ]
    }
  ],
```

## report

Each DPD contains zero or more reports (called a Variant in the UI). These are different ways to display the data from a dataset in list (or list-like) form.

As well as the standard ID, name, description, etc. each report contains:
- **dataset**: A reference to a Standard dataset (see above) to be used to retrieve data for the report (e.g. `"dataset": "$ref:dataset-id"`).
- **filter**: An additional layer of SQL filtering, used to select a subset of data from the dataset's resultset.
  - For example:
   ```json
      "filter": {
        "name": "prefilter_",
        "query": "prefilter_ AS (SELECT * FROM dataset_ WHERE direction = 'In')"
      },
    ```
- **render**: The method used to render the report - currently only `HTML` is supported. 
- **classification**: The classification of the report - in the current classification system only `OFFICIAL` is supported. 
- **policy**: _Unused_
- **specification**: Contains details of how the report should be displayed:
  - **template**: The type of display template to be used:
    - **list**: A standard paged list.
    - **list-section**: An unpaged list split into sections on the fields provided in the `section` list below.
    - **list-tab**: _Unused_ - to be a collation of reports on different tabs.
    - **summary**: A template where the data is not shown - only the page header and footer summaries.
    - **summary-section**: A template where the data is not shown - only the summaries (page/section header/footer), split by section.
  - **section**: A list of names of fields in the below `fields` property whose values should be used to split a sectioned template.
    - For example, if the `ESTABLISHMENT_DESCRIPTION` field was listed here, then the list would be split into sections on establishment name.
  - **field**: A list of supplementary display information for dataset fields. Not required for `summary` templates, but should include sectioning fields:
    - **name**: A reference to the dataset field (e.g. `$ref:firstname`).
    - **display**: The name of the field to display in the report and in the filters, if filtered (e.g. `First name`).
    - **formula**: A formula-based transform used on the values before they are returned to the UI. See "Field Formulae" in the "Notable Features" section below.
    - **visible**: Whether the field's column on the report should be visible by default:
      - **true**: Visible by default (can be removed).
      - **false**: Hidden by default (can be added).
      - **mandatory**: Visible (cannot be removed).
    - **sortable**: Whether the report list can be sorted on this field.
    - **defaultsort**: Whether this field is the report's default sort option. If more than one field is selected, the first is used.
    - **wordwrap**: How the contents of the field values will be wrapped if it is larger than the cell:
      - **none**: Avoid wrapping where possible - useful for things like name.
      - **normal**: Default behaviour - wrap when necessary.
      - **break-words**: Wrap text adding line breaks wherever (even within words) - useful when the text contains very long words or values.
    - **alias**: _Unused_
    - **filter**: See "Filters" in the "Notable Features" section below.
    - **type**: The data type of the field. Used for deciding cell alignment and default transforms (e.g. rendering dates).
    - **header**: Whether this content should be displayed with header formatting (in bold). Useful for when the column data contains labels.
- **summary**: A list of summaries to be displayed on the report.
  - **id**: The unique ID of the summary.
  - **dataset**: A reference to the Summary dataset to be used for source data.
  - **template**: How the summary should be displayed on the page:
    - **page-header**: Displayed above the list or sectioned list.
    - **page-header**: Displayed below the list or sectioned list.
    - **section-header**: Displayed between the section header and section content. The dataset results need to include the sectioned fields in order to be split into the relevant sections (e.g. a summary on a report split by establishment needs to include establishment so the summary data also be split).
    - **section-footer**: As per the section-header, but between the section content and the next section header.
    - **table-header**: Displayed at the top of a list table - between the table's header row and the table content. The summary fields must match the list fields in order to be displayed. The summary data must also contain the sectioned fields if the list is sectioned.
    - **table-footer**: Displayed at the bottom of a list table, with the same restrictions as the table header.
  - **field**: An optional list of supplementary information on how to display the summary dataset's fields:
    - **name**: A reference to a summary dataset field.
    - **header**: Whether this content should be displayed with header formatting (in bold). Useful for when the column data contains labels.
    - **mergeRows**: Whether vertically adjacent field values that are the same should be merged into a single cell.

## dashboards

TBD

## metrics

TBD

# Notable Features

This section covers some features that involve changes in more than one DPD section, and/or benefit from more detailed explanation.  

## Field Formulae

### Basic token usage

A field's value can be transformed before it is returns by the API, using a formula. Basic usage looks like this:
```
${FIRST_NAME} "${NICKNAME}" ${LAST_NAME}
```
Field names wrapped in `${...}` are replaced with the values of those fields in the current row of data. The above formula would return something like `John "Danger" Smith`.

### Special tokens

Other than field names, the formula supports the following special tokens:
- `-${env}`: Transforms to the environment suffix (if it is set), for example `-dev`. If  the environment suffix is not set (as in production), then the token (including the leading hyphen) is removed.

### Functions

The formula field also supports functions:
- `format_date(value, format)`
  - Supports standard Java date format strings. 
  - For example: `format_date(${BIRTH_DATE}, 'dd/MM/yyyy')` would return `01/02/2003`
- `make_url(url, displayValue, openInNewWindow)`
  - For example: `make_url('https://prisoner-${env}.digital.prison.service.justice.gov.uk/prisoner/${prisoner_number}',${prisoner_number},TRUE)` creates an HTML a link to the prisoner profile that opens in a new window, with the prisoner number as the displayed text. 

## Summaries

Summaries are defined in two parts:
- The Summary Dataset, which defines how the source data (from the list's Standard dataset) is to be queried into summary data.
- The Summary report property, which defines how the summary should be displayed on the page (position, header fields, etc.).

### Data Workflow

The summary dataset query is run as a follow-up query based on the results of a Standard Dataset. For example:
- Standard Dataset is run to retrieve a list of prisoners and is stored in an external table named `A` in the `reports` schema.
- Summary datasets are requested by the UI (there may be multiple), and the `${tableId}` token is replaced with `reports.A` (e.g. `SELECT COUNT(1) FROM reports.A`).
- Summary dataset results are stored in an external table with the summary's ID as a suffix (e.g. `reports.A-total`).

## Sections

A report can be displayed in sections - separate lists and/or summaries for each value of a field. For example, a list of External Movements could be sectioned into a list per destination establishment, or by direction.

Each section has its own title, header/footer summaries, and potentially also table summaries.

Report sectioning is defined in two places within the report specification:
- The template should be set to `list-section` for a sectioned list, or `summary-section` for a sectioned series of summaries.
- The `section` list should contain a list of fields to section on (e.g. `direction`, `establishment`).

Notably, the field to be sectioned on needs to be part of the field specification for a report (so that its display name is known), but should be set to not visible by default.

## Filters

Filters are used to filter data displayed in a report. They are displayed either on the Request Report page (for async), or in the Filters section of a sync report.

### Types

Filters can have the following types:
- **radio**: A group of radio boxes.
- **select**: A drop-down box of options.
- **date**: A single date picker.
- **daterange**: Two date pickers (start and end), with the option to select a relative range (such as "Last month").
- **text**: A standard text box that allows the user to type a value.
- **autocomplete**: A text box which displays options for the user to pick from, as they type. 
- **granulardaterange**: A date range input which will allow for granular date selection e.g. hourly, daily etc. 

### Validation

The following properties define validation checks for filter values:
- **mandatory**: Whether the filter requires a value. If this is false, a "(No filter)" option is shown on `radio` and `select` filters.
- **pattern**: The entered value is validated against the provided regular expression. This is mostly used for `text` filters.

### Options

Filter options are used for `select`, `radio`, and `autocomplete` filter types.

#### Static options

Filter options can be statically defined in the DPD like so:

```json
"filter": {
  "type": "radio",
  "staticoptions": [
    {
      "name": "in",
      "display": "In"
    },
    {
      "name": "out",
      "display": "Out"
    }
  ]
}
```

#### Dynamic options

Filter options they can also be dynamically defined. This can be achieved in one of two ways. The first is to simply query the unfiltered dataset for unique values (which can be very slow):

```json
"filter": {
  "type": "autocomplete",
  "dynamicoptions": {
    "minimumLength": 1,
    "returnAsStaticOptions": true,
    "maximumOptions": 20
  }
}
```

Alternatively, a separate Filter dataset can be used. This runs a specific dedicated query to get the list of possible options:

```json
"filter": {
  "type": "autocomplete",
  "dynamicoptions": {
    "maximumOptions": 200,
    "returnAsStaticOptions": true,
    "dataset": "establishment-filter-dataset",
    "name": "establishment_code",
    "display": "establishment_name"
  }
}
```

Here is a more detailed explanation of the Dynamic filter properties:
- **minimumLength**: If using an autocomplete filter, this determines how many characters need to be typed before autocomplete options are shown.
- **returnAsStaticOptions**: Should always be set to `true`. 
  - `true` causes the options to be returned in the definition, as if they have been statically defined.
  - `false` causes an autocomplete filter to request options from a separate API endpoint as the user types. This is no longer supported.
- **maximumOptions**: The maximum number of options to offer. This is to avoid report writers accidentally creating definitions that overwhelm the service.
- **dataset**: The ID of the dataset to use to fetch options.
- **name**: The dataset field that should be used for the filter options' back-end value.
- **display**: The dataset field that should be used for the filter options' displayed value.

### Interactive

- **interactive**: Whether the filter should be shown on the list/dashboard itself, or on the Request screen:
  - **true**: Used on the results page - applied to the _results_ of the requested report.
  - **false**: Used on the Report Request page - limiting the _initial query_.

For example, a "Visits by Person" report could have a mandatory non-interactive filter for "NOMS Number", and an optional interactive filter for "Establishment".
- The NOMS Number would be displayed on the Report Request page. The user would enter the prisoner's number and then request the report.
- The report would be run and cached for that particular prisoner. 
- When the user views the report, they would have the option to further explore the visits by selecting which Establishment they were in (or All). 

### Other properties

- **min/max**: Restrict the available values in the `date` and `daterange` date pickers.
- **default**: The default value for a filter. For `date` and `daterange` filters this can include values relative to today (in ISO format) using a formula:
  - `today()`: The current date.
  - `today(-7,DAYS)`: The date a week ago.
  - `today(2,YEARS)`: The date in 2 years time.
- **defaultGranularity**: Sets the default granularity for the "granulardaterange" filter type. This can be hourly, daily, weekly, monthly, quarterly or annually.
- **defaultQuickFilterValue**: Sets the default value for a quick filter. Values include today, yesterday, last-seven-days, next-year and more. The intention is either the "default" or "defaultQuickFilterValue" to be set. When this value is set, the "default" filter property must not be set. If both "defaultQuickFilterValue" and "default" are set "defaultQuickFilterValue" will take precedence.

