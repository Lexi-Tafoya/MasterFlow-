(function (global) {
  "use strict";

  const REQUIRED_HEADERS = Object.freeze([
    "rate_card_type",
    "direction",
    "carrier",
    "service_code",
    "service_name",
    "package_type",
    "rate_basis",
    "zone",
    "weight_label",
    "weight_min_lb",
    "weight_max_lb",
    "rate_usd",
    "minimum_charge_usd",
    "currency",
    "effective_date",
    "rate_year",
    "fuel_included",
    "origin_scope",
    "source_workbook",
    "source_sheet",
    "source_row",
    "notes"
  ]);

  function text(value) {
    return value == null ? "" : String(value);
  }

  function trimmed(value) {
    return text(value).trim();
  }

  function upper(value) {
    return trimmed(value).toUpperCase();
  }

  function numberOrNull(value) {
    const raw = trimmed(value);
    if (!raw) return null;
    const parsed = Number(raw.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
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

    if (inQuotes) throw new Error("CSV contains an unterminated quoted field.");

    if (cell !== "" || row.length > 0) {
      row.push(cell);
      if (row.some((value) => trimmed(value) !== "")) rows.push(row);
    }

    return rows;
  }

  function normalizeRecord(raw, context) {
    const errors = [];
    const warnings = [];
    const rateCardType = upper(raw.rate_card_type);
    const direction = upper(raw.direction);
    const carrier = upper(raw.carrier);
    const serviceCode = trimmed(raw.service_code);
    const serviceName = trimmed(raw.service_name);
    const packageType = upper(raw.package_type);
    const rateBasis = upper(raw.rate_basis);
    const zone = trimmed(raw.zone);
    const weightLabel = trimmed(raw.weight_label);
    const weightMin = numberOrNull(raw.weight_min_lb);
    const weightMax = numberOrNull(raw.weight_max_lb);
    const rate = numberOrNull(raw.rate_usd);
    const minimum = numberOrNull(raw.minimum_charge_usd);
    const currency = upper(raw.currency || "USD");
    const rateYear = numberOrNull(raw.rate_year);
    const sourceRow = numberOrNull(raw.source_row);

    if (!["DOMESTIC", "IMPORT", "EXPORT"].includes(rateCardType)) {
      errors.push(issue("INVALID_RATE_CARD_TYPE", "rate_card_type must be DOMESTIC, IMPORT, or EXPORT.", "rate_card_type", raw.rate_card_type));
    }
    if (!direction) errors.push(issue("REQUIRED_DIRECTION", "direction is required.", "direction", raw.direction));
    if (!carrier) errors.push(issue("REQUIRED_CARRIER", "carrier is required.", "carrier", raw.carrier));
    if (!serviceCode) errors.push(issue("REQUIRED_SERVICE_CODE", "service_code is required.", "service_code", raw.service_code));
    if (!serviceName) errors.push(issue("REQUIRED_SERVICE_NAME", "service_name is required.", "service_name", raw.service_name));
    if (!packageType) errors.push(issue("REQUIRED_PACKAGE_TYPE", "package_type is required.", "package_type", raw.package_type));
    if (!["FLAT", "PER_LB"].includes(rateBasis)) {
      errors.push(issue("INVALID_RATE_BASIS", "rate_basis must be FLAT or PER_LB.", "rate_basis", raw.rate_basis));
    }
    if (!zone) errors.push(issue("REQUIRED_ZONE", "zone is required.", "zone", raw.zone));
    if (weightMin == null || weightMin < 0) {
      errors.push(issue("INVALID_WEIGHT_MIN", "weight_min_lb must be zero or greater.", "weight_min_lb", raw.weight_min_lb));
    }
    if (weightMax != null && weightMin != null && weightMax < weightMin) {
      errors.push(issue("INVALID_WEIGHT_RANGE", "weight_max_lb must be blank or greater than or equal to weight_min_lb.", "weight_max_lb", raw.weight_max_lb));
    }
    if (rate == null || rate < 0) {
      errors.push(issue("INVALID_RATE", "rate_usd must be zero or greater.", "rate_usd", raw.rate_usd));
    }
    if (minimum != null && minimum < 0) {
      errors.push(issue("INVALID_MINIMUM", "minimum_charge_usd must be blank or zero or greater.", "minimum_charge_usd", raw.minimum_charge_usd));
    }
    if (currency !== "USD") {
      warnings.push(issue("NON_USD_CURRENCY", "The prototype rate lookup displays USD only.", "currency", raw.currency));
    }
    if (upper(raw.fuel_included) !== "FALSE") {
      warnings.push(issue("FUEL_STATUS_REVIEW", "The uploaded rate row does not explicitly state that fuel is excluded.", "fuel_included", raw.fuel_included));
    }

    return {
      rate_card_type: rateCardType,
      direction,
      carrier,
      service_code: serviceCode,
      service_name: serviceName,
      package_type: packageType,
      rate_basis: rateBasis,
      zone,
      weight_label: weightLabel,
      weight_min_lb: weightMin,
      weight_max_lb: weightMax,
      rate_usd: rate,
      minimum_charge_usd: minimum,
      currency,
      effective_date: trimmed(raw.effective_date) || null,
      rate_year: rateYear,
      fuel_included: upper(raw.fuel_included) === "TRUE",
      origin_scope: trimmed(raw.origin_scope),
      source_workbook: trimmed(raw.source_workbook),
      source_sheet: trimmed(raw.source_sheet),
      source_row: sourceRow,
      notes: trimmed(raw.notes),
      source_file_name: context.sourceFileName,
      original_row_number: context.originalRowNumber,
      validation_errors: errors,
      validation_warnings: warnings
    };
  }

  function summarize(records) {
    const summary = {
      total_rate_rows: 0,
      valid_rate_rows: 0,
      invalid_rate_rows: 0,
      domestic_rate_rows: 0,
      import_rate_rows: 0,
      export_rate_rows: 0,
      flat_rate_rows: 0,
      per_lb_rate_rows: 0,
      service_count: 0,
      zone_count: 0,
      effective_dates: [],
      rate_years: []
    };
    const services = new Set();
    const zones = new Set();
    const dates = new Set();
    const years = new Set();

    (records || []).forEach((record) => {
      summary.total_rate_rows += 1;
      if (record.validation_errors.length) summary.invalid_rate_rows += 1;
      else summary.valid_rate_rows += 1;
      if (record.rate_card_type === "DOMESTIC") summary.domestic_rate_rows += 1;
      if (record.rate_card_type === "IMPORT") summary.import_rate_rows += 1;
      if (record.rate_card_type === "EXPORT") summary.export_rate_rows += 1;
      if (record.rate_basis === "FLAT") summary.flat_rate_rows += 1;
      if (record.rate_basis === "PER_LB") summary.per_lb_rate_rows += 1;
      if (record.service_code) services.add(`${record.rate_card_type}|${record.service_code}`);
      if (record.zone) zones.add(`${record.rate_card_type}|${record.zone}`);
      if (record.effective_date) dates.add(record.effective_date);
      if (record.rate_year != null) years.add(record.rate_year);
    });

    summary.service_count = services.size;
    summary.zone_count = zones.size;
    summary.effective_dates = Array.from(dates).sort();
    summary.rate_years = Array.from(years).sort();
    return summary;
  }

  function parseText(csvText, options) {
    const settings = Object.assign({ sourceFileName: "carrier-rate-cards.csv" }, options || {});
    const rows = parseCsv(csvText);

    if (!rows.length) {
      return {
        source_file_name: settings.sourceFileName,
        headers: [],
        records: [],
        summary: summarize([]),
        file_errors: [issue("EMPTY_FILE", "The rate-card CSV contains no records.")]
      };
    }

    const headers = rows[0].map((value) => trimmed(value).replace(/^\uFEFF/, ""));
    const fileErrors = [];
    REQUIRED_HEADERS.forEach((header) => {
      if (!headers.includes(header)) {
        fileErrors.push(issue("MISSING_HEADER", `Required rate-card column ${header} is missing.`, header));
      }
    });

    if (fileErrors.length) {
      return {
        source_file_name: settings.sourceFileName,
        headers,
        records: [],
        summary: summarize([]),
        file_errors: fileErrors
      };
    }

    const records = rows.slice(1).map((row, index) => {
      const raw = {};
      headers.forEach((header, columnIndex) => {
        raw[header] = row[columnIndex] == null ? "" : row[columnIndex];
      });
      return normalizeRecord(raw, {
        sourceFileName: settings.sourceFileName,
        originalRowNumber: index + 2
      });
    });

    return {
      source_file_name: settings.sourceFileName,
      headers,
      records,
      summary: summarize(records),
      file_errors: []
    };
  }

  async function parseFile(file) {
    if (!file || typeof file.text !== "function") throw new TypeError("parseFile expects a browser File object.");
    return parseText(await file.text(), { sourceFileName: file.name });
  }

  function combine(results) {
    const records = [];
    const fileErrors = [];
    (results || []).forEach((result) => {
      (result.records || []).forEach((record) => records.push(record));
      (result.file_errors || []).forEach((error) => fileErrors.push(Object.assign({ source_file_name: result.source_file_name }, error)));
    });
    return {
      records,
      file_errors: fileErrors,
      summary: summarize(records)
    };
  }

  function unique(values) {
    return Array.from(new Set((values || []).filter((value) => value != null && trimmed(value) !== "")));
  }

  function listServices(library, rateCardType) {
    const selectedType = upper(rateCardType);
    const map = new Map();
    (library && library.records ? library.records : [])
      .filter((record) => !record.validation_errors.length)
      .filter((record) => !selectedType || record.rate_card_type === selectedType)
      .forEach((record) => {
        const key = `${record.rate_card_type}|${record.service_code}`;
        if (!map.has(key)) {
          map.set(key, {
            rate_card_type: record.rate_card_type,
            service_code: record.service_code,
            service_name: record.service_name
          });
        }
      });
    return Array.from(map.values()).sort((a, b) => a.service_name.localeCompare(b.service_name));
  }

  function listZones(library, rateCardType, serviceCode) {
    return unique((library && library.records ? library.records : [])
      .filter((record) => !record.validation_errors.length)
      .filter((record) => !rateCardType || record.rate_card_type === upper(rateCardType))
      .filter((record) => !serviceCode || record.service_code === serviceCode)
      .map((record) => record.zone))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  function listPackageTypes(library, rateCardType, serviceCode, zone) {
    return unique((library && library.records ? library.records : [])
      .filter((record) => !record.validation_errors.length)
      .filter((record) => !rateCardType || record.rate_card_type === upper(rateCardType))
      .filter((record) => !serviceCode || record.service_code === serviceCode)
      .filter((record) => !zone || record.zone === String(zone))
      .map((record) => record.package_type))
      .sort();
  }

  function packageCompatibility(recordPackageType, requestedPackageType) {
    const recordType = upper(recordPackageType);
    const requestType = upper(requestedPackageType);
    if (!requestType) return 1;
    if (recordType === requestType) return 3;
    if (requestType === "PACKAGE" && ["NON_DOCUMENT", "DOCUMENT"].includes(recordType)) return 2;
    if (["NON_DOCUMENT", "DOCUMENT"].includes(requestType) && recordType === "PACKAGE") return 1;
    return 0;
  }

  function quote(library, request) {
    const input = Object.assign({}, request || {});
    const rateCardType = upper(input.rate_card_type);
    const serviceCode = trimmed(input.service_code);
    const zone = trimmed(input.zone);
    const packageType = upper(input.package_type || "PACKAGE");
    const billableWeight = Number(input.billable_weight_lb);

    const errors = [];
    if (!["DOMESTIC", "IMPORT", "EXPORT"].includes(rateCardType)) errors.push("Choose Domestic, Import, or Export.");
    if (!serviceCode) errors.push("Choose a service.");
    if (!zone) errors.push("Choose a zone.");
    if (!Number.isFinite(billableWeight) || billableWeight < 0) errors.push("Enter a valid billable weight.");
    if (errors.length) return { ok: false, errors };

    const candidates = (library && library.records ? library.records : [])
      .filter((record) => !record.validation_errors.length)
      .filter((record) => record.rate_card_type === rateCardType)
      .filter((record) => record.service_code === serviceCode)
      .filter((record) => record.zone === zone)
      .map((record) => ({ record, compatibility: packageCompatibility(record.package_type, packageType) }))
      .filter((item) => item.compatibility > 0);

    const flat = candidates
      .filter((item) => item.record.rate_basis === "FLAT")
      .filter((item) => item.record.weight_max_lb != null && item.record.weight_max_lb >= billableWeight)
      .sort((left, right) => {
        if (right.compatibility !== left.compatibility) return right.compatibility - left.compatibility;
        return left.record.weight_max_lb - right.record.weight_max_lb;
      });

    if (flat.length) {
      const selected = flat[0].record;
      return {
        ok: true,
        rate_card_type: rateCardType,
        carrier: selected.carrier,
        service_code: selected.service_code,
        service_name: selected.service_name,
        zone,
        package_type: selected.package_type,
        billable_weight_lb: billableWeight,
        published_weight_label: selected.weight_label,
        rate_basis: selected.rate_basis,
        rate_usd: selected.rate_usd,
        minimum_charge_usd: selected.minimum_charge_usd,
        base_transportation_charge_usd: selected.rate_usd,
        fuel_included: selected.fuel_included,
        effective_date: selected.effective_date,
        rate_year: selected.rate_year,
        source_workbook: selected.source_workbook,
        source_sheet: selected.source_sheet,
        source_row: selected.source_row,
        warning: "Base transportation only. Fuel, accessorials, package count, dimensional weight, negotiated discounts, and actual shipment charges are not included."
      };
    }

    const perPound = candidates
      .filter((item) => item.record.rate_basis === "PER_LB")
      .filter((item) => item.record.weight_min_lb != null && billableWeight >= item.record.weight_min_lb)
      .filter((item) => item.record.weight_max_lb == null || billableWeight <= item.record.weight_max_lb)
      .sort((left, right) => {
        if (right.compatibility !== left.compatibility) return right.compatibility - left.compatibility;
        return right.record.weight_min_lb - left.record.weight_min_lb;
      });

    if (perPound.length) {
      const selected = perPound[0].record;
      const calculated = billableWeight * selected.rate_usd;
      const charge = selected.minimum_charge_usd == null ? calculated : Math.max(calculated, selected.minimum_charge_usd);
      return {
        ok: true,
        rate_card_type: rateCardType,
        carrier: selected.carrier,
        service_code: selected.service_code,
        service_name: selected.service_name,
        zone,
        package_type: selected.package_type,
        billable_weight_lb: billableWeight,
        published_weight_label: selected.weight_label,
        rate_basis: selected.rate_basis,
        rate_usd: selected.rate_usd,
        minimum_charge_usd: selected.minimum_charge_usd,
        calculated_weight_charge_usd: calculated,
        base_transportation_charge_usd: charge,
        fuel_included: selected.fuel_included,
        effective_date: selected.effective_date,
        rate_year: selected.rate_year,
        source_workbook: selected.source_workbook,
        source_sheet: selected.source_sheet,
        source_row: selected.source_row,
        warning: "Base transportation only. Fuel, accessorials, package count, dimensional weight, negotiated discounts, and actual shipment charges are not included."
      };
    }

    return {
      ok: false,
      errors: ["No published rate row matched the selected rate type, service, zone, package type, and billable weight."]
    };
  }

  function recommendCheapest(library, request) {
    const input = Object.assign({}, request || {});
    const rateCardType = upper(input.rate_card_type);
    const zone = trimmed(input.zone);
    const packageType = upper(input.package_type || "PACKAGE");
    const billableWeight = Number(input.billable_weight_lb);
    const excludeServiceCode = trimmed(input.exclude_service_code);

    if (!["DOMESTIC", "IMPORT", "EXPORT"].includes(rateCardType) || !zone || !Number.isFinite(billableWeight) || billableWeight < 0) {
      return { ok: false, errors: ["Choose a rate category, zone, and valid billable weight before requesting a recommendation."] };
    }

    const alternativeServices = listServices(library, rateCardType).filter((service) => service.service_code !== excludeServiceCode);
    const options = alternativeServices
      .map((service) => quote(library, {
        rate_card_type: rateCardType,
        service_code: service.service_code,
        zone,
        package_type: packageType,
        billable_weight_lb: billableWeight
      }))
      .filter((result) => result.ok);

    if (!options.length) {
      // Different carrier services commonly use different zone-numbering schemes for the
      // same physical destination (e.g. Ground zone "2" vs 2nd Day Air zone "202"), so a
      // search under the current service's zone code can find nothing even when a cheaper
      // alternative genuinely exists under a different zone code for that same service.
      const errors = alternativeServices.length
        ? [`No other ${rateCardType.toLowerCase()} service in this library published a rate under zone ${zone}, package type ${packageType}, and this billable weight. Other carrier services commonly use a different zone-numbering scheme for the same destination -- use the manual published base-rate lookup below to check other services independently.`]
        : ["No other services are available in this rate category to compare against."];
      return { ok: false, errors };
    }

    options.sort((left, right) => left.base_transportation_charge_usd - right.base_transportation_charge_usd);
    return { ok: true, recommended: options[0], alternatives_considered: options.length };
  }

  const api = Object.freeze({
    REQUIRED_HEADERS,
    parseCsv,
    parseText,
    parseFile,
    combine,
    listServices,
    listZones,
    listPackageTypes,
    quote,
    recommendCheapest
  });

  global.MasterFlowRateCards = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
