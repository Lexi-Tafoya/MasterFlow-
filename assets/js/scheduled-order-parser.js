(function (global) {
  "use strict";

  const SOURCE_TO_NORMALIZED = Object.freeze({
    "UPD RUN": "update_run",
    UPDFLG: "update_flag",
    ALLOCATION: "allocation",
    WH: "warehouse_code",
    "CNTL-LN": "combined_control_identifier",
    "ORDER STAT": "order_status",
    "PRC PART": "prc_part_raw",
    "DUE DATE": "customer_due_date",
    "CUST#": "customer_number",
    "ORD QTY": "order_quantity",
    "EXT RESALE": "extended_resale",
    "EXT COST": "extended_cost",
    "ORDER TYPE": "order_type",
    "ORDER COMPLETE": "order_complete",
    "SHIP VIA": "ship_via",
    "NEW DUE": "line_scheduled_print_date",
    ISR: "inside_sales_representative_initials",
    "REQUESTDATE$": "warehouse_print_request_date"
  });

  const REQUIRED_HEADERS = Object.freeze(Object.keys(SOURCE_TO_NORMALIZED));

  const DESTINATION_SOURCE_HEADERS = Object.freeze({
    "SHIP ADDRESS": "ship_address",
    CITY: "ship_city",
    STATE: "ship_state_province",
    "STATE OR PROVINCE": "ship_state_province",
    "ZIP CODE": "ship_postal_code",
    "ZIP OR POSTAL CODE": "ship_postal_code",
    "POSTAL CODE": "ship_postal_code",
    COUNTRY: "ship_country"
  });

  const COMBINED_23_HEADERS = Object.freeze([
    "UPD RUN", "UPDFLG", "ALLOCATION", "WH", "CNTL-LN", "ORDER STAT", "PRC PART", "DUE DATE", "CUST#",
    "SHIP ADDRESS", "CITY", "STATE", "ZIP CODE", "COUNTRY",
    "ORD QTY", "EXT RESALE", "EXT COST", "ORDER TYPE", "ORDER COMPLETE", "SHIP VIA", "NEW DUE", "ISR", "REQUESTDATE$"
  ]);

  const WAREHOUSE_ORIGINS = Object.freeze({
    PH: Object.freeze({
      warehouse_name: "Phoenix Warehouse",
      origin_city: "Phoenix",
      origin_state_province: "AZ",
      origin_postal_code: "85034",
      origin_country: "UNITED STATES"
    })
  });

  const US_STATE_CODES = Object.freeze({
    ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA", COLORADO: "CO",
    CONNECTICUT: "CT", DELAWARE: "DE", FLORIDA: "FL", GEORGIA: "GA", HAWAII: "HI", IDAHO: "ID",
    ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA", KANSAS: "KS", KENTUCKY: "KY", LOUISIANA: "LA",
    MAINE: "ME", MARYLAND: "MD", MASSACHUSETTS: "MA", MICHIGAN: "MI", MINNESOTA: "MN",
    MISSISSIPPI: "MS", MISSOURI: "MO", MONTANA: "MT", NEBRASKA: "NE", NEVADA: "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR",
    PENNSYLVANIA: "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD",
    TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT", VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA",
    "WEST VIRGINIA": "WV", WISCONSIN: "WI", WYOMING: "WY", "DISTRICT OF COLUMBIA": "DC",
    AL: "AL", AK: "AK", AZ: "AZ", AR: "AR", CA: "CA", CO: "CO", CT: "CT", DE: "DE", FL: "FL",
    GA: "GA", HI: "HI", ID: "ID", IL: "IL", IN: "IN", IA: "IA", KS: "KS", KY: "KY", LA: "LA",
    ME: "ME", MD: "MD", MA: "MA", MI: "MI", MN: "MN", MS: "MS", MO: "MO", MT: "MT", NE: "NE",
    NV: "NV", NH: "NH", NJ: "NJ", NM: "NM", NY: "NY", NC: "NC", ND: "ND", OH: "OH", OK: "OK",
    OR: "OR", PA: "PA", RI: "RI", SC: "SC", SD: "SD", TN: "TN", TX: "TX", UT: "UT", VT: "VT",
    VA: "VA", WA: "WA", WV: "WV", WI: "WI", WY: "WY", DC: "DC"
  });

  const KNOWN_VALUES = Object.freeze({
    update_run: new Set(["POSTED"]),
    update_flag: new Set(["QUALIFIED"]),
    allocation: new Set(["SOFTFULL", "SOFTZERO"]),
    warehouse_code: new Set(["PH"]),
    order_status: new Set(["0", "1", "5"]),
    order_type: new Set(["S", "U"]),
    order_complete: new Set(["L", "P", "C"])
  });

  function text(value) {
    return value == null ? "" : String(value);
  }

  function trimmed(value) {
    return text(value).trim();
  }

  function upper(value) {
    return trimmed(value).toUpperCase();
  }

  function canonicalHeader(value) {
    return text(value)
      .replace(/^\uFEFF/, "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
  }

  function collapsedUpper(value) {
    return upper(value).replace(/\s+/g, " ");
  }

  function rawValue(raw, aliases) {
    for (const alias of aliases) {
      const key = canonicalHeader(alias);
      if (Object.prototype.hasOwnProperty.call(raw, key)) return raw[key];
    }
    return "";
  }

  function normalizeCountry(value) {
    const raw = collapsedUpper(value);
    if (!raw) return "";
    if (["US", "USA", "U.S.", "U.S.A.", "UNITED STATES OF AMERICA", "UNITED STATES"].includes(raw)) return "UNITED STATES";
    if (["KOREA, REPUBLIC OF", "REPUBLIC OF KOREA", "SOUTH KOREA"].includes(raw)) return "REPUBLIC OF KOREA";
    return raw;
  }

  function normalizeStateProvince(value) {
    const raw = collapsedUpper(value);
    if (!raw) return { value: "", is_us_state: false };
    const code = US_STATE_CODES[raw];
    return { value: code || raw, is_us_state: Boolean(code) };
  }

  function normalizePostalCode(value, country) {
    let raw = collapsedUpper(value);
    if (!raw) return "";
    if (country === "UNITED STATES") {
      const digits = raw.replace(/\D/g, "");
      if (digits.length === 4) return digits.padStart(5, "0");
      if (digits.length === 5) return digits;
      if (digits.length === 9) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return raw.replace(/\s+/g, " ");
  }

  function normalizeDestination(raw, context, warnings) {
    const hasColumns = Boolean(context && context.hasDestinationColumns);
    const shipAddressRaw = trimmed(rawValue(raw, ["SHIP ADDRESS"]));
    const cityRaw = trimmed(rawValue(raw, ["CITY"]));
    const stateRaw = trimmed(rawValue(raw, ["STATE", "STATE OR PROVINCE"]));
    const postalRaw = trimmed(rawValue(raw, ["ZIP CODE", "ZIP OR POSTAL CODE", "POSTAL CODE"]));
    const countryRaw = trimmed(rawValue(raw, ["COUNTRY"]));

    if (!hasColumns) {
      return {
        ship_address: null,
        ship_city: null,
        ship_state_province: null,
        ship_postal_code: null,
        ship_country: null,
        destination_status: "not_provided",
        destination_group_eligible: false,
        destination_key: null,
        destination_display: "Destination not provided",
        destination_country_inferred: false,
        raw_destination_values: { ship_address: "", city: "", state_province: "", postal_code: "", country: "" }
      };
    }

    const city = collapsedUpper(cityRaw);
    const stateInfo = normalizeStateProvince(stateRaw);
    let country = normalizeCountry(countryRaw);
    let inferred = false;

    if (!country && stateInfo.is_us_state && postalRaw) {
      country = "UNITED STATES";
      inferred = true;
    }

    const postal = normalizePostalCode(postalRaw, country);
    const address = collapsedUpper(shipAddressRaw);
    const state = stateInfo.value;
    const complete = Boolean(city && postal && country && (country !== "UNITED STATES" || stateInfo.is_us_state));
    const status = complete ? (inferred ? "inferred" : "confirmed") : "review_required";

    if (!complete) {
      warnings.push(issue(
        "DESTINATION_REVIEW_REQUIRED",
        "Destination city, state/province, postal code, or country is incomplete or ambiguous. Confirm the ship-to destination before consolidation.",
        "DESTINATION",
        [cityRaw, stateRaw, postalRaw, countryRaw].filter(Boolean).join(" | ")
      ));
    } else if (inferred) {
      warnings.push(issue(
        "DESTINATION_COUNTRY_INFERRED",
        "Country was inferred as UNITED STATES from the state and postal code.",
        "COUNTRY",
        country
      ));
    }

    const key = complete ? [country, state, city, postal].join("|") : null;
    const displayParts = [city, state, postal, country].filter(Boolean);

    return {
      ship_address: address || null,
      ship_city: city || null,
      ship_state_province: state || null,
      ship_postal_code: postal || null,
      ship_country: country || null,
      destination_status: status,
      destination_group_eligible: complete,
      destination_key: key,
      destination_display: displayParts.length ? displayParts.join(", ") : "Destination confirmation required",
      destination_country_inferred: inferred,
      raw_destination_values: {
        ship_address: shipAddressRaw,
        city: cityRaw,
        state_province: stateRaw,
        postal_code: postalRaw,
        country: countryRaw
      }
    };
  }

  function issue(code, message, field, value) {
    return {
      code,
      message,
      field: field || null,
      value: value == null ? null : value
    };
  }

  function parseCsv(csvText) {
    const input = text(csvText).replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      const next = input[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === "," && !inQuotes) {
        row.push(cell);
        cell = "";
        continue;
      }

      if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") index += 1;
        row.push(cell);
        if (row.some((value) => trimmed(value) !== "")) rows.push(row);
        row = [];
        cell = "";
        continue;
      }

      cell += char;
    }

    if (inQuotes) {
      throw new Error("CSV contains an unterminated quoted field.");
    }

    if (cell !== "" || row.length > 0) {
      row.push(cell);
      if (row.some((value) => trimmed(value) !== "")) rows.push(row);
    }

    return rows;
  }

  function parseDate(value, field, errors) {
    const raw = trimmed(value);
    if (!raw) {
      errors.push(issue("REQUIRED_DATE", `${field} is required.`, field, value));
      return null;
    }

    let year;
    let month;
    let day;
    let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    } else {
      match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
      if (match) {
        month = Number(match[1]);
        day = Number(match[2]);
        year = Number(match[3]);
        if (year < 100) year += year >= 70 ? 1900 : 2000;
      } else {
        match = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (match) {
          year = Number(match[1]);
          month = Number(match[2]);
          day = Number(match[3]);
        }
      }
    }

    if (!year || !month || !day) {
      errors.push(issue("INVALID_DATE", `${field} is not a supported date.`, field, value));
      return null;
    }

    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      candidate.getUTCFullYear() !== year ||
      candidate.getUTCMonth() !== month - 1 ||
      candidate.getUTCDate() !== day
    ) {
      errors.push(issue("INVALID_DATE", `${field} is not a valid calendar date.`, field, value));
      return null;
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function parseNumber(value, field, errors, options) {
    const settings = Object.assign({ allowZero: true, allowNegative: false }, options || {});
    const raw = trimmed(value);

    if (!raw) {
      errors.push(issue("REQUIRED_NUMBER", `${field} is required.`, field, value));
      return null;
    }

    let cleaned = raw.replace(/[$,\s]/g, "");
    if (/^\(.*\)$/.test(cleaned)) cleaned = `-${cleaned.slice(1, -1)}`;
    const number = Number(cleaned);

    if (!Number.isFinite(number)) {
      errors.push(issue("INVALID_NUMBER", `${field} must be numeric.`, field, value));
      return null;
    }

    if (!settings.allowNegative && number < 0) {
      errors.push(issue("NEGATIVE_NUMBER", `${field} must not be negative.`, field, value));
    }

    if (!settings.allowZero && number === 0) {
      errors.push(issue("ZERO_NUMBER", `${field} must be greater than zero.`, field, value));
    }

    return number;
  }

  function parseControlIdentifier(value, errors) {
    const raw = trimmed(value);
    if (!raw) {
      errors.push(issue("REQUIRED_CONTROL", "CNTL-LN is required.", "CNTL-LN", value));
      return { control_number: null, control_suffix: null };
    }

    const match = raw.match(/^(.*)-(\d+)$/);
    if (!match || !trimmed(match[1])) {
      errors.push(issue(
        "INVALID_CONTROL_IDENTIFIER",
        "CNTL-LN must end with a numeric release suffix, such as A1ECOT-03.",
        "CNTL-LN",
        value
      ));
      return { control_number: raw, control_suffix: null };
    }

    return {
      control_number: trimmed(match[1]),
      control_suffix: match[2].padStart(2, "0")
    };
  }

  function parsePrcPart(value, errors) {
    const raw = text(value);
    if (!trimmed(raw)) {
      errors.push(issue("REQUIRED_PRC_PART", "PRC PART is required.", "PRC PART", value));
      return { product_code: null, part_number: null };
    }

    if (raw.length < 4) {
      errors.push(issue(
        "INVALID_PRC_PART",
        "PRC PART must contain a three-character Product Code segment followed by a Part Number.",
        "PRC PART",
        value
      ));
    }

    const productCode = raw.slice(0, 3).trim();
    const partNumber = raw.slice(3).trim();

    if (!productCode) {
      errors.push(issue("BLANK_PRODUCT_CODE", "The derived Product Code is blank.", "PRC PART", value));
    }
    if (!partNumber) {
      errors.push(issue("BLANK_PART_NUMBER", "The derived Part Number is blank.", "PRC PART", value));
    }

    return {
      product_code: productCode || null,
      part_number: partNumber || null
    };
  }

  function requireText(value, field, errors, transform) {
    const parsed = transform ? transform(value) : trimmed(value);
    if (!parsed) {
      errors.push(issue("REQUIRED_TEXT", `${field} is required.`, field, value));
      return null;
    }
    return parsed;
  }

  function addUnexpectedValueWarning(value, normalizedField, sourceField, warnings) {
    const known = KNOWN_VALUES[normalizedField];
    if (value && known && !known.has(value)) {
      warnings.push(issue(
        "UNREVIEWED_VALUE",
        `${sourceField} contains an unreviewed value and was preserved without assigning a business meaning.`,
        sourceField,
        value
      ));
    }
  }

  function refreshDisposition(record) {
    if (record.validation_errors.length > 0) {
      record.freight_review_disposition = "invalid";
      record.freight_review_eligible = false;
      record.actionable_now = false;
      return;
    }

    if (record.order_complete === "C") {
      record.freight_review_disposition = "excluded";
      record.freight_review_eligible = false;
      record.actionable_now = false;
      record.exclusion_reason = "ORDER COMPLETE is C; the individual part line is complete.";
      return;
    }

    record.freight_review_eligible = true;
    record.freight_review_disposition = record.validation_warnings.length > 0 ? "flagged" : "eligible";
    record.actionable_now = record.allocation === "SOFTFULL";
    record.exclusion_reason = null;
  }

  function normalizeRecord(raw, context) {
    const errors = [];
    const warnings = [];

    const updateRun = requireText(raw["UPD RUN"], "UPD RUN", errors, upper);
    const updateFlag = requireText(raw.UPDFLG, "UPDFLG", errors, upper);
    const allocation = requireText(raw.ALLOCATION, "ALLOCATION", errors, upper);
    const warehouseCode = requireText(raw.WH, "WH", errors, upper);
    const orderStatus = requireText(raw["ORDER STAT"], "Order Stat", errors, trimmed);
    const orderType = requireText(raw["ORDER TYPE"], "ORDER TYPE", errors, upper);
    const orderComplete = requireText(raw["ORDER COMPLETE"], "ORDER COMPLETE", errors, upper);
    const customerNumber = requireText(raw["CUST#"], "CUST#", errors, trimmed);
    const shipVia = requireText(raw["SHIP VIA"], "SHIP VIA", errors, trimmed);
    const isr = requireText(raw.ISR, "ISR", errors, upper);

    addUnexpectedValueWarning(updateRun, "update_run", "UPD RUN", warnings);
    addUnexpectedValueWarning(updateFlag, "update_flag", "UPDFLG", warnings);
    addUnexpectedValueWarning(allocation, "allocation", "ALLOCATION", warnings);
    addUnexpectedValueWarning(warehouseCode, "warehouse_code", "WH", warnings);
    addUnexpectedValueWarning(orderStatus, "order_status", "Order Stat", warnings);
    addUnexpectedValueWarning(orderType, "order_type", "ORDER TYPE", warnings);

    if (orderComplete && !KNOWN_VALUES.order_complete.has(orderComplete)) {
      errors.push(issue(
        "UNKNOWN_COMPLETION_STATUS",
        "ORDER COMPLETE must be L, P, or C before freight eligibility can be determined.",
        "ORDER COMPLETE",
        orderComplete
      ));
    }

    if (allocation === "SOFTZERO") {
      warnings.push(issue(
        "NO_SOFT_ALLOCATION",
        "No inventory is currently soft allocated. Keep the line visible, but flag it as not ready for fulfillment.",
        "ALLOCATION",
        allocation
      ));
    }

    const controls = parseControlIdentifier(raw["CNTL-LN"], errors);
    const prcPart = parsePrcPart(raw["PRC PART"], errors);
    const customerDueDate = parseDate(raw["DUE DATE"], "DUE DATE", errors);
    const lineScheduledPrintDate = parseDate(raw["NEW DUE"], "NEW DUE", errors);
    const warehousePrintRequestDate = parseDate(raw["REQUESTDATE$"], "REQUESTDATE$", errors);
    const orderQuantity = parseNumber(raw["ORD QTY"], "ORD QTY", errors, { allowZero: false, allowNegative: false });
    const extendedResale = parseNumber(raw["EXT RESALE"], "EXT RESALE", errors, { allowZero: true, allowNegative: false });
    const extendedCost = parseNumber(raw["EXT COST"], "EXT COST", errors, { allowZero: true, allowNegative: false });

    const grossMargin = Number.isFinite(extendedResale) && Number.isFinite(extendedCost)
      ? extendedResale - extendedCost
      : null;
    const grossMarginPercent = Number.isFinite(grossMargin) && extendedResale > 0
      ? (grossMargin / extendedResale) * 100
      : null;

    const destination = normalizeDestination(raw, context, warnings);
    const warehouseOrigin = WAREHOUSE_ORIGINS[warehouseCode] || null;

    const record = {
      source_file_name: context.sourceFileName,
      original_row_number: context.originalRowNumber,
      raw_source_values: Object.assign({}, raw),

      update_run: updateRun,
      update_flag: updateFlag,
      allocation,
      warehouse_code: warehouseCode,
      combined_control_identifier: trimmed(raw["CNTL-LN"]) || null,
      control_number: controls.control_number,
      control_suffix: controls.control_suffix,
      order_status: orderStatus,
      prc_part_raw: text(raw["PRC PART"]),
      product_code: prcPart.product_code,
      part_number: prcPart.part_number,
      customer_due_date: customerDueDate,
      customer_number: customerNumber,
      order_quantity: orderQuantity,
      extended_resale: extendedResale,
      extended_cost: extendedCost,
      order_type: orderType,
      order_complete: orderComplete,
      ship_via: shipVia,
      line_scheduled_print_date: lineScheduledPrintDate,
      inside_sales_representative_initials: isr,
      warehouse_print_request_date: warehousePrintRequestDate,
      effective_warehouse_print_date: warehousePrintRequestDate || lineScheduledPrintDate,
      request_date_overrides_new_due: Boolean(
        warehousePrintRequestDate &&
        lineScheduledPrintDate &&
        warehousePrintRequestDate !== lineScheduledPrintDate
      ),

      ship_address: destination.ship_address,
      ship_city: destination.ship_city,
      ship_state_province: destination.ship_state_province,
      ship_postal_code: destination.ship_postal_code,
      ship_country: destination.ship_country,
      destination_status: destination.destination_status,
      destination_group_eligible: destination.destination_group_eligible,
      destination_key: destination.destination_key,
      destination_display: destination.destination_display,
      destination_country_inferred: destination.destination_country_inferred,
      raw_destination_values: destination.raw_destination_values,

      warehouse_name: warehouseOrigin ? warehouseOrigin.warehouse_name : null,
      origin_city: warehouseOrigin ? warehouseOrigin.origin_city : null,
      origin_state_province: warehouseOrigin ? warehouseOrigin.origin_state_province : null,
      origin_postal_code: warehouseOrigin ? warehouseOrigin.origin_postal_code : null,
      origin_country: warehouseOrigin ? warehouseOrigin.origin_country : null,

      gross_margin: grossMargin,
      gross_margin_percent: grossMarginPercent,
      ready_for_fulfillment: allocation === "SOFTFULL",
      requires_inventory_follow_up: allocation === "SOFTZERO",
      validation_errors: errors,
      validation_warnings: warnings,
      exact_duplicate_of_row: null,
      exclusion_reason: null,
      freight_review_disposition: null,
      freight_review_eligible: false,
      actionable_now: false
    };

    record.line_identity_key = [
      record.control_number || "",
      record.control_suffix || "",
      record.product_code || "",
      record.part_number || ""
    ].join("|");

    refreshDisposition(record);
    return record;
  }

  function createSummary(records) {
    return records.reduce((summary, record) => {
      summary.total_rows += 1;
      summary[`${record.freight_review_disposition}_rows`] += 1;
      if (record.allocation === "SOFTZERO") summary.softzero_rows += 1;
      if (record.order_complete === "C") summary.complete_rows += 1;
      if (record.exact_duplicate_of_row != null) summary.exact_duplicate_rows += 1;
      if (record.actionable_now) summary.actionable_now_rows += 1;
      if (record.destination_status === "confirmed") summary.destination_confirmed_rows += 1;
      if (record.destination_status === "inferred") summary.destination_inferred_rows += 1;
      if (record.destination_status === "review_required") summary.destination_review_rows += 1;
      if (record.destination_status === "not_provided") summary.destination_not_provided_rows += 1;
      return summary;
    }, {
      total_rows: 0,
      eligible_rows: 0,
      flagged_rows: 0,
      excluded_rows: 0,
      invalid_rows: 0,
      softzero_rows: 0,
      complete_rows: 0,
      exact_duplicate_rows: 0,
      actionable_now_rows: 0,
      destination_confirmed_rows: 0,
      destination_inferred_rows: 0,
      destination_review_rows: 0,
      destination_not_provided_rows: 0
    });
  }

  function parseText(csvText, options) {
    const settings = Object.assign({ sourceFileName: "scheduled-orders.csv" }, options || {});
    const rows = parseCsv(csvText);

    if (rows.length === 0) {
      return {
        source_file_name: settings.sourceFileName,
        headers: [],
        records: [],
        summary: createSummary([]),
        file_errors: [issue("EMPTY_FILE", "The CSV file contains no records.")]
      };
    }

    let rawHeaders = rows[0].map((header) => text(header).replace(/^\uFEFF/, "").trim());
    let headers = rawHeaders.map(canonicalHeader);
    let dataRows = rows.slice(1);
    const fileErrors = [];

    const recognizedHeaderCount = REQUIRED_HEADERS.filter((required) => headers.includes(required)).length;
    const looksLikeHeaderlessCombined = recognizedHeaderCount < 5 && rows[0].length === COMBINED_23_HEADERS.length;
    if (looksLikeHeaderlessCombined) {
      rawHeaders = COMBINED_23_HEADERS.slice();
      headers = COMBINED_23_HEADERS.slice();
      dataRows = rows;
    }

    const hasDestinationColumns = headers.some((header) => Object.prototype.hasOwnProperty.call(DESTINATION_SOURCE_HEADERS, header));
    const headerCounts = new Map();

    headers.forEach((header) => headerCounts.set(header, (headerCounts.get(header) || 0) + 1));
    headerCounts.forEach((count, header) => {
      if (count > 1) {
        fileErrors.push(issue("DUPLICATE_HEADER", `The CSV contains the header ${header} more than once.`, header));
      }
    });

    REQUIRED_HEADERS.forEach((required) => {
      if (!headers.includes(required)) {
        fileErrors.push(issue("MISSING_HEADER", `Required source column ${required} is missing.`, required));
      }
    });

    if (fileErrors.length > 0) {
      return {
        source_file_name: settings.sourceFileName,
        headers: rawHeaders,
        records: [],
        summary: createSummary([]),
        file_errors: fileErrors
      };
    }

    const records = [];
    const exactFingerprints = new Map();

    dataRows.forEach((row, index) => {
      const raw = {};
      headers.forEach((header, columnIndex) => {
        raw[header] = row[columnIndex] == null ? "" : row[columnIndex];
      });

      const originalRowNumber = index + (looksLikeHeaderlessCombined ? 1 : 2);
      const record = normalizeRecord(raw, {
        sourceFileName: settings.sourceFileName,
        originalRowNumber,
        hasDestinationColumns
      });

      const fingerprint = headers.map((header) => text(raw[header])).join("\u001F");
      if (exactFingerprints.has(fingerprint)) {
        record.exact_duplicate_of_row = exactFingerprints.get(fingerprint);
        record.validation_warnings.push(issue(
          "EXACT_DUPLICATE",
          `This row exactly duplicates source row ${record.exact_duplicate_of_row}.`,
          null,
          null
        ));
        refreshDisposition(record);
      } else {
        exactFingerprints.set(fingerprint, originalRowNumber);
      }

      records.push(record);
    });

    return {
      source_file_name: settings.sourceFileName,
      headers: rawHeaders,
      records,
      summary: createSummary(records),
      file_errors: []
    };
  }

  async function parseFile(file) {
    if (!file || typeof file.text !== "function") {
      throw new TypeError("parseFile expects a browser File object.");
    }
    return parseText(await file.text(), { sourceFileName: file.name });
  }

  async function parseFiles(files) {
    return Promise.all(Array.from(files || []).map(parseFile));
  }

  const api = Object.freeze({
    SOURCE_TO_NORMALIZED,
    DESTINATION_SOURCE_HEADERS,
    COMBINED_23_HEADERS,
    WAREHOUSE_ORIGINS,
    REQUIRED_HEADERS,
    parseCsv,
    parseText,
    parseFile,
    parseFiles
  });

  global.MasterFlowScheduledOrders = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
