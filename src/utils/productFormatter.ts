import { POST_FIELDS_MAP } from "@src/constants/postFields";
import i18n from "@src/i18n";

export interface FormattedDetail {
  label: string;
  value: string;
  key: string;
}

function normalizeOptionKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function translateIfExists(key: string): string | null {
  const translated = i18n.t(key);
  return translated === key ? null : translated;
}

function getTranslatedFieldLabel(fieldKey: string, fallback: string): string {
  return i18n.t(`fields.${fieldKey}`, { defaultValue: fallback });
}

function getTranslatedFieldValue(fieldKey: string, rawValue: string): string {
  const normalizedValue = normalizeOptionKey(rawValue);
  if (!normalizedValue) {
    return rawValue;
  }

  const fieldOptionKey = `fieldOptions.${fieldKey}.${normalizedValue}`;
  const optionValueKey = `optionValues.${normalizedValue}`;

  const translatedFieldOption = translateIfExists(fieldOptionKey);
  if (translatedFieldOption) {
    return translatedFieldOption;
  }

  const translatedOptionValue = translateIfExists(optionValueKey);
  if (translatedOptionValue) {
    return translatedOptionValue;
  }

  return rawValue;
}

/**
 * Formats product details from draft into a human-readable array
 * @param subCategory - The product subcategory
 * @param details - The details object containing field values
 * @returns Array of formatted details with labels and values
 */
export function formatProductDetails(
  subCategory: string,
  details: Record<string, any>,
): FormattedDetail[] {
  const fields = POST_FIELDS_MAP[subCategory] || [];
  const formatted: FormattedDetail[] = [];

  fields.forEach((field) => {
    const value = details[field.key];

    // Skip empty values
    if (value === undefined || value === null || value === "") {
      return;
    }

    // Get the label
    const label = getTranslatedFieldLabel(field.key, field.label || field.key);

    // Format the value based on field type
    let formattedValue = String(value);

    if (typeof value === "string") {
      formattedValue = getTranslatedFieldValue(field.key, value);
    }

    // Add units for specific fields
    if (field.key === "mileage") {
      formattedValue += " KM";
    } else if (
      field.key === "screenSize" ||
      field.key === "btu" ||
      field.key === "hearts"
    ) {
      formattedValue += field.key === "screenSize" ? '"' : "";
    } else if (field.key === "area") {
      formattedValue += " sqm";
    } else if (field.key === "capacity" && subCategory === "Fridges") {
      formattedValue += " L";
    } else if (field.key === "capacity" && subCategory === "Washing Machines") {
      formattedValue += " kg";
    } else if (
      field.key === "dailyRate" ||
      field.key === "monthlyRate"
    ) {
      formattedValue = `$${formattedValue}`;
    } else if (
      field.key === "horsepower" ||
      field.key === "hours" ||
      field.key === "gear"
    ) {
      const unitMap: Record<string, string> = {
        horsepower: " hp",
        hours: " h",
        gear: " speeds",
      };
      formattedValue += unitMap[field.key] || "";
    } else if (field.key === "engineSize") {
      formattedValue += " cc";
    }

    formatted.push({
      label,
      value: formattedValue,
      key: field.key,
    });
  });

  return formatted;
}

/**
 * Creates a single-line summary of key product details
 * @param subCategory - The product subcategory
 * @param details - The details object containing field values
 * @returns A formatted summary string
 */
export function getProductDetailsSummary(
  subCategory: string,
  details: Record<string, any>,
): string {
  const formatted = formatProductDetails(subCategory, details);

  if (formatted.length === 0) {
    return i18n.t("productFormatter.noDetailsAdded", {
      defaultValue: "No details added yet",
    });
  }

  // Get key fields based on subcategory
  const keyFieldsMap: Record<string, string[]> = {
    Phone: ["brand", "model", "ram", "storage"],
    Tablet: ["brand", "model", "screenSize"],
    Laptop: ["brand", "model", "processor", "ram"],
    Car: ["brand", "model", "year", "mileage"],
    Motorcycle: ["brand", "model", "year", "engineSize"],
    House: ["bedrooms", "bathrooms", "area"],
    Condo: ["bedrooms", "bathrooms", "area"],
  };

  const keyFields = keyFieldsMap[subCategory] || [];
  const summaryParts: string[] = [];
  const separator = i18n.t("common.separator_bullet", { defaultValue: "•" });

  // Add key fields to summary with labels
  keyFields.forEach((key) => {
    const detail = formatted.find((f) => f.key === key);
    if (detail) {
      // Include field label for better clarity, especially in Khmer
      const fieldLabel = i18n.t(`fields.${key}`, { defaultValue: detail.label });
      summaryParts.push(`${fieldLabel}: ${detail.value}`);
    }
  });

  return summaryParts.length > 0 ? summaryParts.join(` ${separator} `) : formatted[0].value;
}

/**
 * Validates if required fields are filled
 * @param subCategory - The product subcategory
 * @param details - The details object containing field values
 * @returns Object with validation results
 */
export function validateProductDetails(
  subCategory: string,
  details: Record<string, any>,
): { isValid: boolean; missingFields: string[] } {
  const fields = POST_FIELDS_MAP[subCategory] || [];
  const missingFields: string[] = [];

  fields.forEach((field) => {
    if (field.required) {
      const value = details[field.key];
      if (value === undefined || value === null || value === "") {
        missingFields.push(
          getTranslatedFieldLabel(field.key, field.label || field.key),
        );
      }
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

export interface DataQualityIssue {
  field: string;
  fieldKey: string;
  issue: string;
  suggestion: string;
  severity: "error" | "warning" | "info";
}

/**
 * Validates data quality and detects incomplete/short information
 * @param subCategory - The product subcategory
 * @param details - The details object containing field values
 * @returns Array of quality issues found
 */
export function validateDataQuality(
  subCategory: string,
  details: Record<string, any>,
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const fields = POST_FIELDS_MAP[subCategory] || [];

  // Field-specific validation rules
  const validationRules: Record<string, (value: string) => DataQualityIssue | null> = {
    brand: (value) => {
      if (value.length < 2) {
        return {
          field: "Brand",
          fieldKey: "brand",
          issue: "Brand name is too short",
          suggestion: "Enter full brand name (e.g., Apple, Samsung, Honda)",
          severity: "warning",
        };
      }
      return null;
    },
    model: (value) => {
      if (value.length < 2) {
        return {
          field: "Model",
          fieldKey: "model",
          issue: "Model name is too short",
          suggestion: "Enter complete model name (e.g., iPhone 13 Pro, Galaxy S23)",
          severity: "warning",
        };
      }
      return null;
    },
    title: (value) => {
      if (value.length < 10) {
        return {
          field: "Title",
          fieldKey: "title",
          issue: "Title is too short - not descriptive",
          suggestion: "Add more details (e.g., 'Barely used iPhone 13 Pro in excellent condition')",
          severity: "warning",
        };
      }
      if (value.length > 150) {
        return {
          field: "Title",
          fieldKey: "title",
          issue: "Title is too long",
          suggestion: "Keep title concise, under 150 characters",
          severity: "info",
        };
      }
      return null;
    },
    description: (value) => {
      if (value.length < 20) {
        return {
          field: "Description",
          fieldKey: "description",
          issue: "Description is too short",
          suggestion: "Add details about condition, features, reason for selling, etc.",
          severity: "warning",
        };
      }
      return null;
    },
    price: (value) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) {
        return {
          field: "Price",
          fieldKey: "price",
          issue: "Invalid price",
          suggestion: "Enter a valid price amount",
          severity: "error",
        };
      }
      return null;
    },
    mileage: (value) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return {
          field: "Mileage",
          fieldKey: "mileage",
          issue: "Mileage should be a number",
          suggestion: "Enter mileage in kilometers (e.g., 45000)",
          severity: "error",
        };
      }
      return null;
    },
    year: (value) => {
      const numValue = parseInt(value);
      const currentYear = new Date().getFullYear();
      if (isNaN(numValue) || numValue < 1900 || numValue > currentYear) {
        return {
          field: "Year",
          fieldKey: "year",
          issue: "Invalid year",
          suggestion: `Enter a year between 1900 and ${currentYear}`,
          severity: "error",
        };
      }
      return null;
    },
    bedrooms: (value) => {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 20) {
        return {
          field: "Bedrooms",
          fieldKey: "bedrooms",
          issue: "Invalid bedroom count",
          suggestion: "Enter number of bedrooms (0-20)",
          severity: "error",
        };
      }
      return null;
    },
    bathrooms: (value) => {
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 20) {
        return {
          field: "Bathrooms",
          fieldKey: "bathrooms",
          issue: "Invalid bathroom count",
          suggestion: "Enter number of bathrooms (0-20)",
          severity: "error",
        };
      }
      return null;
    },
  };

  // Check each detail against validation rules
  fields.forEach((field) => {
    const value = details[field.key];
    if (value && typeof value === "string" && value.trim()) {
      const validator = validationRules[field.key];
      if (validator) {
        const issue = validator(value.trim());
        if (issue) {
          issues.push(issue);
        }
      }
    }
  });

  return issues;
}

/**
 * Gets suggestions for a specific field based on subcategory
 * @param fieldKey - The field key
 * @param subCategory - The product subcategory
 * @returns Helpful suggestion text
 */
export function getFieldSuggestion(
  fieldKey: string,
  subCategory: string,
): string {
  const suggestions: Record<string, Record<string, string>> = {
    Phone: {
      brand: "e.g., Apple, Samsung, OnePlus, Xiaomi",
      model: "e.g., iPhone 13 Pro, Galaxy S23 Ultra",
      storage: "e.g., 128GB, 256GB, 512GB",
      ram: "e.g., 4GB, 6GB, 8GB, 12GB",
      condition: "Choose from: New, Like New, Used, Refurbished",
    },
    Car: {
      brand: "e.g., Toyota, Honda, BMW, Mercedes",
      model: "e.g., Camry, Civic, 3 Series",
      year: "e.g., 2023, 2022, 2021",
      mileage: "e.g., 45000 (in kilometers)",
      fuelType: "Choose from: Petrol, Diesel, Electric, Hybrid",
      transmission: "Choose from: Manual, Automatic",
      color: "e.g., Black, White, Silver, Red",
    },
    House: {
      bedrooms: "e.g., 1, 2, 3, 4, 5+",
      bathrooms: "e.g., 1, 1.5, 2, 2.5, 3",
      area: "e.g., 100 (in square meters)",
      landSize: "e.g., 200 (total land in sqm)",
      furnished: "Choose from: Fully Furnished, Semi Furnished, Unfurnished",
    },
  };

  return suggestions[subCategory]?.[fieldKey] || i18n.t("productFormatter.provideRelevantInfo", {
      defaultValue: "Please provide relevant information",
    });
}

export interface DescriptionSuggestion {
  isGeneric: boolean;
  suggested: string;
  shouldShow: boolean;
}

/**
 * Generates an enhanced description based on filled product details
 * @param subCategory - The product subcategory
 * @param currentDescription - Current description from user
 * @param details - The details object containing field values
 * @param language - Optional language code (en or kh), defaults to current i18n.language
 * @returns Enhanced description suggestion
 */
export function generateDescriptionSuggestion(
  subCategory: string,
  currentDescription: string,
  details: Record<string, any>,
  language?: string,
): DescriptionSuggestion {
  // Helper function to get effective value for fields with "Others" option
  const getEffectiveValue = (details: Record<string, any>, fieldName: string) => {
    const value = details[fieldName] ? String(details[fieldName]).trim() : "";
    if (value === "Others" && details[`${fieldName}_custom`]) {
      return String(details[`${fieldName}_custom`]).trim();
    }
    return value || undefined;
  };

  // Generic descriptions that trigger suggestions
  const genericDescriptions = [
    "good condition",
    "new",
    "used",
    "excellent",
    "nice",
    "good",
    "ok",
    "fine",
    "works",
    "as is",
    "great",
    "perfect",
  ];

  const trimmedDescription = currentDescription?.trim() || "";
  const currentLanguage = language || i18n.language || "en";
  const isKh = currentLanguage?.startsWith("kh");

  const toOptionKey = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const localizeOptionValue = (value: string) =>
    i18n.t(`optionValues.${toOptionKey(value)}`, { defaultValue: value });
  
  const isGeneric = trimmedDescription
    ? genericDescriptions.some((generic) =>
        trimmedDescription.toLowerCase() === generic ||
        (trimmedDescription.toLowerCase().includes(generic) && trimmedDescription.length < 50)
      )
    : false;

  // Don't show suggestion if description is already comprehensive
  if (!isGeneric && trimmedDescription.length >= 80) {
    return {
      isGeneric: false,
      suggested: trimmedDescription,
      shouldShow: false,
    };
  }

  // Count how many meaningful details we have
  const meaningfulDetails = Object.values(details).filter(
    (v) => v && String(v).trim().length > 0
  ).length;

  // Don't suggest if we have absolutely no details to work with
  // But if user has written a description, we can still enhance it
  if (meaningfulDetails === 0 && trimmedDescription.length === 0) {
    return {
      isGeneric,
      suggested: trimmedDescription,
      shouldShow: false,
    };
  }

  // Khmer-first suggestion path for Khmer UI language
  if (isKh) {
    let khDescription = "";

    // Create natural Khmer descriptions based on category
    if (subCategory === "Phone" || subCategory === "Tablet") {
      const brand = getEffectiveValue(details, "brand");
      const model = details.model ? String(details.model).trim() : "";
      const storage = getEffectiveValue(details, "storage");
      const ram = getEffectiveValue(details, "ram");
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (brand && model) {
        khDescription = `នេះគឺជា ${localizeOptionValue(brand)} ${model}`;
        if (storage) khDescription += ` មានអង្គផ្ទុនទិន្នន័យ ${storage}`;
        if (ram) khDescription += ` និង RAM ${ram}`;
        if (condition) khDescription += ` ស្ថានភាព${condition}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ដំណើរការបានល្អឥតខ្ចោះ ជាជម្រើសល្អបំផុតសម្រាប់អ្នក! ទំនុកចិត្តបាននូវគុណភាព។";
    } else if (subCategory === "Car" || subCategory === "Motorcycle") {
      const brand = getEffectiveValue(details, "brand");
      const model = details.model ? String(details.model).trim() : "";
      const year = details.year ? String(details.year).trim() : "";
      const mileage = details.mileage ? String(details.mileage).trim() : "";
      const color = details.color ? localizeOptionValue(String(details.color).trim()) : "";

      if (brand && model) {
        khDescription = year ? `${localizeOptionValue(brand)} ${model} ឆ្នាំ ${year}` : `${localizeOptionValue(brand)} ${model}`;
        if (mileage) khDescription += ` បានរត់ ${mileage}km`;
        if (color) khDescription += ` ពណ៌${color}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "រក្សាបានល្អណាស់ រត់ដូចថ្មី អ្នកនឹងពេញចិត្តជាមិនខាន! មានភាពធានា។";
    } else if (subCategory === "House" || subCategory === "Condo" || subCategory === "Apartment") {
      const bedrooms = details.bedrooms ? String(details.bedrooms).trim() : "";
      const bathrooms = details.bathrooms ? String(details.bathrooms).trim() : "";
      const area = details.area ? String(details.area).trim() : "";

      if (bedrooms || area) {
        khDescription = "";
        if (bedrooms) khDescription += `មាន ${bedrooms} បន្ទប់គេង`;
        if (bathrooms) khDescription += bedrooms ? ` និង ${bathrooms} បន្ទប់ទឹក` : `មាន ${bathrooms} បន្ទប់ទឹក`;
        if (area) khDescription += ` ទំហំសរុប ${area}m²`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ទីតាំងអស្ចារ្យ បរិយាកាសស្រស់ស្អាត ជាផ្ទះក្តីស្រមៃរបស់អ្នក! មកមើលទៅអ្នកនឹងស្រឡាញ់។";
    } else if (subCategory === "Laptop" || subCategory === "Desktop") {
      const brand = getEffectiveValue(details, "brand");
      const processor = details.processor ? String(details.processor).trim() : "";
      const ram = getEffectiveValue(details, "ram");
      const storage = getEffectiveValue(details, "storage");

      if (brand) {
        khDescription = `${localizeOptionValue(brand)}`;
        if (processor) khDescription += ` ${processor}`;
        if (ram) khDescription += ` RAM ${ram}`;
        if (storage) khDescription += ` Storage ${storage}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ដំណើរការលឿនខ្លាំង សមត្ថភាពខ្ពស់ អ្នកនឹងមានបទពិសោធន៍ល្អបំផុត! សមនឹងតម្លៃណាស់។";
    } else if (subCategory === "Smart Watch") {
      const brand = getEffectiveValue(details, "brand");
      const model = details.model ? String(details.model).trim() : "";
      const compatibility = details.compatibility ? String(details.compatibility).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (brand || model) {
        khDescription = `នាឡិកាស្មាតវេជ ${localizeOptionValue(brand || "")} ${model || ""}`.trim();
        if (compatibility) khDescription += ` ត្រូវគ្នាជាមួយ ${localizeOptionValue(compatibility)}`;
        if (condition) khDescription += ` ស្ថានភាព${condition}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ល្អសម្រាប់តាមដានសុខភាព និងការប្រើប្រាស់ប្រចាំថ្ងៃ! អ្នកនឹងពេញចិត្តជាមិនខាន។";
    } else if (subCategory === "Phone Accessories") {
      const type = details.type ? String(details.type).trim() : "";
      const brand = getEffectiveValue(details, "brand");
      const compatibility = details.compatibility ? String(details.compatibility).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (type) {
        khDescription = brand ? `${localizeOptionValue(brand)} ${localizeOptionValue(type)}` : localizeOptionValue(type);
        if (compatibility) khDescription += ` សម្រាប់ ${localizeOptionValue(compatibility)}`;
        if (condition) khDescription += ` ស្ថានភាព${condition}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "គុណភាពខ្ពស់ ធ្វើឱ្យឧបករណ៍របស់អ្នកប្រសើរជាងមុន! តម្លៃសមរម្យណាស់។";
    } else if (subCategory === "Bicycle") {
      const type = details.type ? String(details.type).trim() : "";
      const brand = getEffectiveValue(details, "brand");
      const gear = details.gear ? String(details.gear).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (type) {
        khDescription = brand ? `កង់ ${localizeOptionValue(brand)} ${localizeOptionValue(type)}` : `កង់${localizeOptionValue(type)}`;
        if (gear) khDescription += ` មាន ${gear} ល្បឿន`;
        if (condition) khDescription += ` ស្ថានភាព${condition}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ល្អសម្រាប់ធ្វើដំណើរ និងហាត់ប្រាណ! រត់រលូន ប្រើប្រាស់បានយូរ។";
    } else if (subCategory === "Lorries" || subCategory === "Tractors" || subCategory === "Tuk Tuk & Remork") {
      const brand = getEffectiveValue(details, "brand");
      const model = details.model ? String(details.model).trim() : "";
      const year = details.year ? String(details.year).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (brand || model) {
        khDescription = year ? `${localizeOptionValue(brand || "")} ${model} ឆ្នាំ ${year}` : `${localizeOptionValue(brand || "")} ${model}`.trim();
        if (condition) khDescription += ` ស្ថានភាព${condition}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "យានយន្តរឹងមាំ សមត្ថភាពខ្ពស់ សមរម្យសម្រាប់ការងារធុនធ្ងន់! ប្រើប្រាស់មានប្រសិទ្ធភាព សន្សំប្រាក់។";
    } else if (subCategory === "Parts & Accessories" && (details.vehicleType || details.partType)) {
      const partType = details.partType ? localizeOptionValue(String(details.partType).trim()) : "";
      const brand = getEffectiveValue(details, "brand");
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = "គ្រឿងបន្លាស់";
      if (brand) khDescription += ` ${localizeOptionValue(brand)}`;
      if (partType) khDescription += ` ${partType}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "គុណភាពល្អ តម្លៃសមរម្យ ធ្វើឱ្យយានយន្តរបស់អ្នកដំណើរការកាន់តែប្រសើរ! អាចទុកចិត្តបាន។";
    } else if (subCategory === "Vehicles For Rent") {
      const vehicleType = details.vehicleType ? localizeOptionValue(String(details.vehicleType).trim()) : "";
      const dailyRate = details.dailyRate ? String(details.dailyRate).trim() : "";
      const monthlyRate = details.monthlyRate ? String(details.monthlyRate).trim() : "";

      if (vehicleType) {
        khDescription = `${vehicleType} សម្រាប់ជួល`;
        if (dailyRate) khDescription += ` តម្លៃថ្ងៃ $${dailyRate}`;
        if (monthlyRate) khDescription += ` ខែ $${monthlyRate}`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "យានយន្តស្ថានភាពល្អ រត់ដូចថ្មី ជម្រើសល្អបំផុតសម្រាប់ជួល! តម្លៃសមរម្យ សេវាកម្មល្អ។";
    } else if (subCategory === "Skin Care" || subCategory === "Hair Care" || subCategory === "Makeup" || subCategory === "Natural & Organic") {
      const brand = getEffectiveValue(details, "brand");
      const productName = details.productName ? String(details.productName).trim() : "";
      const size = details.size ? String(details.size).trim() : "";

      if (brand || productName) {
        khDescription = brand && productName ? `${localizeOptionValue(brand)} ${productName}` : localizeOptionValue(brand || productName);
        if (size) khDescription += ` (${size})`;
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ផលិតផលសម្រស់ពិតប្រាកដ ធ្វើឱ្យអ្នកកាន់តែស្រស់ស្អាត! យកចិត្ទុកដាក់ខ្លួនឯងអ្នកសមនឹងទទួលបាន។";
    } else if (subCategory === "Tables & Desks" || subCategory === "Chairs & Sofas" || subCategory === "Wardrobes & Cabinets" || subCategory === "Shelves & Drawers" || subCategory === "Beds & Mattresses") {
      const material = details.material ? String(details.material).trim() : "";
      const color = details.color ? String(details.color).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";
      const dimensions = details.dimensions ? String(details.dimensions).trim() : "";

      khDescription = material ? `គ្រឿងសង្ហារឹមស្អាតពី ${localizeOptionValue(material)}` : "គ្រឿងសង្ហារឹមគុណភាពល្អ";
      const features: string[] = [];
      if (color) features.push(`ពណ៌${localizeOptionValue(color)}`);
      if (dimensions) features.push(`ទំហំ ${dimensions}`);
      if (condition) features.push(`ស្ថានភាព${condition}`);
      
      if (features.length > 0) {
        khDescription += " " + features.join(", ");
      }
      khDescription += "។ ";
      khDescription += trimmedDescription || "រឹងមាំ ប្រើប្រាស់បានយូរ នឹងធ្វើឱ្យផ្ទះអ្នកកាន់តែស្រស់ស្អាត! តម្លៃល្អណាស់។";
    } else if (subCategory === "Curtain & Carpet") {
      const material = details.material ? localizeOptionValue(String(details.material).trim()) : "";
      const color = details.color ? localizeOptionValue(String(details.color).trim()) : "";
      const size = details.size ? String(details.size).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = material ? `វាំងនន ឬ កំរាលពី ${material}` : "វាំងនន ឬ កំរាល";
      const features: string[] = [];
      if (color) features.push(`ពណ៌${color}`);
      if (size) features.push(`ទំហំ ${size}`);
      if (condition) features.push(`ស្ថានភាព${condition}`);
      if (features.length > 0) khDescription += " " + features.join(", ");
      khDescription += "។ ";
      khDescription += trimmedDescription || "ស្រស់ស្អាត គុណភាពខ្ពស់ នឹងធ្វើឱ្យផ្ទះអ្នកកាន់តែទាក់ទាញ! តម្លៃសមរម្យណាស់។";
    } else if (subCategory === "Kitchenware") {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const material = details.material ? localizeOptionValue(String(details.material).trim()) : "";
      const brand = getEffectiveValue(details, "brand");
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = "សម្ភារៈផ្ទះបាយ";
      if (type) khDescription += ` ${type}`;
      if (brand) khDescription += ` ${localizeOptionValue(brand)}`;
      if (material) khDescription += ` ${material}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "គុណភាពល្អ ប្រើប្រាស់ងាយ ធ្វើឱ្យការចម្អិនម្ហូបកាន់តែរីករាយ! តម្លៃសមនឹងគុណភាព។";
    } else if (subCategory === "Household Items") {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = type ? `របស់ប្រើប្រាស់ក្នុងផ្ទះ ${type}` : "របស់ប្រើប្រាស់ក្នុងផ្ទះ";
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "ជំនួយសំខាន់សម្រាប់ផ្ទះរបស់អ្នក គុណភាពល្អ ប្រើប្រាស់បានយូរ! តម្លៃពិតជាសមរម្យ។";
    } else if (subCategory === "Handicrafts-Paintings") {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const artist = details.artist ? String(details.artist).trim() : "";
      const dimensions = details.dimensions ? String(details.dimensions).trim() : "";

      khDescription = type ? `សិល្បៈដៃ ${type}` : "សិល្បៈដៃ ឬ គំនូរ";
      if (artist) khDescription += ` ដោយ ${artist}`;
      if (dimensions) khDescription += ` ទំហំ ${dimensions}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "សិល្បៈស្អាតពិសេស ធ្វើដោយដៃ នឹងបន្ថែមតម្លៃឱ្យទីកន្លែងរបស់អ្នក! កម្រមានតម្លៃ។";
    } else if (subCategory === "Women's Fashion" || subCategory === "Men's Fashion" || subCategory === "Baby & Kids") {
      const type = details.type ? String(details.type).trim() : "";
      const brand = getEffectiveValue(details, "brand");
      const size = details.size ? String(details.size).trim() : "";
      const color = details.color ? String(details.color).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (type) {
        khDescription = brand ? `${localizeOptionValue(brand)} ${localizeOptionValue(type)}` : localizeOptionValue(type);
        const details_arr: string[] = [];
        if (size) details_arr.push(`ទំហំ ${size}`);
        if (color) details_arr.push(`ពណ៌${localizeOptionValue(color)}`);
        if (condition) details_arr.push(`ស្ថានភាព${condition}`);
        
        if (details_arr.length > 0) {
          khDescription += " " + details_arr.join(", ");
        }
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ស្ទាយល៍ស្អាត ស្រួលស្លៀកពាក់ សមរម្យគ្រប់ឱកាស! នឹងក្លាយជាសំលៀកបំពាក់ដែលអ្នកចូលចិត្តបំផុត។";
    } else if (subCategory === "Fashion Accessories") {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const brand = getEffectiveValue(details, "brand");
      const material = details.material ? localizeOptionValue(String(details.material).trim()) : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = type ? localizeOptionValue(type) : "គ្រឿងលម្អម៉ូត";
      if (brand) khDescription += ` ${localizeOptionValue(brand)}`;
      if (material) khDescription += ` ${material}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "គ្រឿងលម្អស្អាតល្អ បន្ថែមភាពទាក់ទាញឱ្យអ្នក! តម្លៃសមរម្យ ស្ទាយល៍ប្លែក។";
    } else if (subCategory === "All in One") {
      const brand = getEffectiveValue(details, "brand");
      const model = details.model ? String(details.model).trim() : "";
      const processor = details.processor ? String(details.processor).trim() : "";
      const ram = getEffectiveValue(details, "ram");
      const storage = getEffectiveValue(details, "storage");
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (brand) {
        khDescription = model ? `${localizeOptionValue(brand)} ${model} All-in-One` : `${localizeOptionValue(brand)} All-in-One`;
        const specs: string[] = [];
        if (processor) specs.push(processor);
        if (ram) specs.push(`RAM ${ram}`);
        if (storage) specs.push(`Storage ${storage}`);
        
        if (specs.length > 0) {
          khDescription += " " + specs.join(", ");
        }
        if (condition) {
          khDescription += ` ស្ថានភាព${condition}`;
        }
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ដំណើរការលឿនខ្លាំង សន្សំកន្លែង អ្នកនឹងមានបទពិសោធន៍ល្អបំផុត! សមនឹងតម្លៃណាស់។";
    } else if (subCategory === "Monitor Printer & Scanner") {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const brand = getEffectiveValue(details, "brand");
      const model = details.model ? String(details.model).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = brand && model ? `${localizeOptionValue(brand)} ${model}` : localizeOptionValue(type || brand || "ម៉ូនីទ័រ ឬ ម៉ាស៊ីនបោះពុម្ព");
      if (condition && !brand) khDescription += ` ស្ថានភាព${condition}`;
      else if (condition) khDescription += `, ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "គុណភាពខ្ពស់ ដំណើរការល្អឥតខ្ចោះ បង្កើនផលិតភាពការងាររបស់អ្នក! តម្លៃសមរម្យណាស់។";
    } else if (subCategory === "Parts & Accessories" && !(details.vehicleType || details.partType)) {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const brand = getEffectiveValue(details, "brand");
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = "គ្រឿងបន្លាស់ និង គ្រឿងបរិក្ខារកុំព្យូទ័រ";
      if (type) khDescription += ` ${type}`;
      if (brand) khDescription += ` ${localizeOptionValue(brand)}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "គុណភាពល្អ ត្រូវគ្នា100% ធ្វើឱ្យកុំព្យូទ័ររបស់អ្នកប្រសើរជាងមុន! តម្លៃពិតជាល្អ។";
    } else if (subCategory === "Land") {
      const area = details.area ? String(details.area).trim() : "";
      const landTitle = details.landTitle ? localizeOptionValue(String(details.landTitle).trim()) : "";
      const width = details.width ? String(details.width).trim() : "";
      const length = details.length ? String(details.length).trim() : "";

      if (area) {
        khDescription = `ដីទំហំ ${area}m²`;
        if (width && length) {
          khDescription += ` (${width}m × ${length}m)`;
        }
        if (landTitle) {
          khDescription += ` មាន${landTitle}`;
        }
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ឱកាសវិនិយោគល្អបំផុតក្នុងទីតាំងពិសេស! សក្តានុពលខ្ពស់ សម្រាប់អភិវឌ្ឍន៍។";
    } else if (subCategory === "Washing Machines" || subCategory === "Fridges" || subCategory === "Air Conditioning") {
      const brand = getEffectiveValue(details, "brand");
      const model = details.model ? String(details.model).trim() : "";
      const capacity = details.capacity ? String(details.capacity).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      if (brand) {
        khDescription = model ? `${localizeOptionValue(brand)} ${model}` : localizeOptionValue(brand);
        if (capacity) {
          const unit = subCategory === "Fridges" ? "L" : subCategory === "Washing Machines" ? "kg" : "BTU";
          khDescription += ` ${capacity}${unit}`;
        }
        if (condition) {
          khDescription += ` ស្ថានភាព${condition}`;
        }
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ប្រើប្រាស់ថាមពលតិច ប្រសិទ្ធភាពខ្ពស់! សន្សំចំណាយ ដំណើរការល្អ ជម្រើសឆ្លាតវៃដែលអ្នកនឹងពេញចិត្តរាល់ថ្ងៃ!";
    } else if (subCategory === "Tools" || subCategory === "Machinery") {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const brand = getEffectiveValue(details, "brand");
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = brand ? `${localizeOptionValue(brand)}` : "ឧបករណ៍";
      if (type) khDescription += ` ${type}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "ឧបករណ៍គុណភាពល្អ ប្រើប្រាស់ងាយ សមត្ថភាពខ្ពស់! ជំនួយល្អបំផុតសម្រាប់ការងារ តម្លៃសមរម្យ។";
    } else if (subCategory === "Security Camera") {
      const brand = getEffectiveValue(details, "brand");
      const resolution = details.resolution ? String(details.resolution).trim() : "";
      const model = details.model ? String(details.model).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = brand ? `កាមេរ៉ាសន្តិសុខ ${localizeOptionValue(brand)}` : "កាមេរ៉ាសន្តិសុខ";
      if (model) khDescription += ` ${model}`;
      if (resolution) khDescription += ` គុណភាពរូបភាព ${resolution}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "បច្ចេកវិទ្យាទំនើប រូបភាពច្បាស់ ការពារផ្ទះរបស់អ្នកយ៉ាងមានប្រសិទ្ធភាព! ទុកចិត្តបាន១០០%។";
    } else if (subCategory === "TVs & Audio") {
      const brand = getEffectiveValue(details, "brand");
      const screenSize = details.screenSize ? String(details.screenSize).trim() : "";
      const model = details.model ? String(details.model).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = brand ? `${localizeOptionValue(brand)}` : "ទូរទស្សន៍ ឬ អូឌីយ៉ូ";
      if (model) khDescription += ` ${model}`;
      if (screenSize) khDescription += ` ${screenSize}អ៊ីញ`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "គុណភាពរូបភាព និង សំឡេងខ្ពស់! បទពិសោធន៍កម្សាន្តពិសេស សមរម្យសម្រាប់គ្រួសារ។ តម្លៃល្អណាស់!";
    } else if (subCategory === "Video games") {
      const platform = details.platform ? localizeOptionValue(String(details.platform).trim()) : "";
      const gameName = details.gameName ? String(details.gameName).trim() : "";
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = gameName || "ហ្គេម និង ឧបករណ៍លេងហ្គេម";
      if (platform) khDescription += ` សម្រាប់ ${platform}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "កម្សាន្តពិតជាសប្បាយ! ហ្គេមពេញនិយម គុណភាពល្អ តម្លៃសមរម្យ អ្នកនឹងរីករាយ!";
    } else if (subCategory === "Toys") {
      const type = details.type ? localizeOptionValue(String(details.type).trim()) : "";
      const ageRange = details.ageRange ? String(details.ageRange).trim() : "";
      const brand = getEffectiveValue(details, "brand");
      const condition = details.condition ? localizeOptionValue(String(details.condition).trim()) : "";

      khDescription = "ប្រដាប់លេងកុមារ";
      if (type) khDescription += ` ${type}`;
      if (brand) khDescription += ` ${localizeOptionValue(brand)}`;
      if (ageRange) khDescription += ` សម្រាប់អាយុ ${ageRange}`;
      if (condition) khDescription += ` ស្ថានភាព${condition}`;
      khDescription += "។ ";
      khDescription += trimmedDescription || "ប្រដាប់លេងគុណភាពល្អ សុវត្ថិភាពខ្ពស់ ធ្វើឱ្យកូនអ្នករីករាយ និង អភិវឌ្ឍន៍បញ្ញា! តម្លៃសមរម្យណាស់។";
    } else {
      // Generic Khmer description
      const meaningfulFields = Object.entries(details)
        .filter(([key, v]) => !key.endsWith("_custom") && v && String(v).trim().length > 0)
        .slice(0, 3);
      
      if (meaningfulFields.length > 0) {
        khDescription = "ផលិតផលគុណភាពខ្ពស់ ";
        meaningfulFields.forEach(([_, value]) => {
          const val = String(value).trim();
          if (val) khDescription += `${localizeOptionValue(val)} `;
        });
        khDescription += "។ ";
      }
      khDescription += trimmedDescription || "ស្ថានភាពល្អឥតខ្ចោះ តម្លៃសមរម្យ អ្នកមិនគួរមេីលរំលង​! ទំនាក់ទំនងមកឥឡូវនេះ។";
    }

    const khSuggested = khDescription.replace(/\s+/g, " ").trim();

    return {
      isGeneric,
      suggested: khSuggested,
      shouldShow:
        khSuggested.length > 20 &&  // Has substantial content
        khSuggested !== trimmedDescription &&  // Different from user's current text
        (trimmedDescription.length === 0 ||  // User hasn't written anything yet
         isGeneric ||  // User wrote generic description
         trimmedDescription.length < 50 ||  // User wrote very short description
         khSuggested.length > trimmedDescription.length + 30),  // Our suggestion is significantly longer
    };
  }

  // Build enhanced description based on category - Natural narrative style
  let enhanced = "";

  // Electronics & Gadgets (Category 1)
  if (subCategory === "Phone" || subCategory === "Tablet") {
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";
    const storage = getEffectiveValue(details, "storage");
    const ram = getEffectiveValue(details, "ram");

    // Build description with whatever details we have
    if (brand || model || storage || ram) {
      enhanced = "This is";
      if (brand) enhanced += ` a ${brand}`;
      if (model) enhanced += ` ${model}`;
      if (storage && ram) {
        enhanced += ` featuring ${storage} of storage and ${ram} RAM`;
      } else if (storage) {
        enhanced += ` with ${storage} of storage`;
      } else if (ram) {
        enhanced += ` with ${ram} RAM`;
      }
      if (condition) {
        enhanced += `, in ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.fullyFunctional", {
      defaultValue: "Works flawlessly and ready to brighten your day! You'll absolutely love the experience. Great value for money!",
    });
  } else if (subCategory === "Smart Watch") {
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";
    const compatibility = details.compatibility ? String(details.compatibility).trim() : "";

    if (brand || model) {
      enhanced = `${brand || ""} ${model || ""}`.trim() + " smartwatch";
      if (compatibility) {
        enhanced += ` that's compatible with ${compatibility}`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.greatForFitness", {
      defaultValue: "Your perfect companion for staying fit and connected! Makes every workout and activity more enjoyable.",
    });
  } else if (subCategory === "Phone Accessories") {
    const type = details.type ? String(details.type).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const compatibility = details.compatibility ? String(details.compatibility).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type) {
      enhanced = brand ? `${brand} ${type}` : type;
      if (compatibility) {
        enhanced += ` designed for ${compatibility}`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.highQuality", {
      defaultValue: "Premium quality accessory that truly elevates your experience! You'll notice the difference immediately.",
    });
  }

  // Vehicles (Category 2)
  else if (subCategory === "Car" || subCategory === "Motorcycle") {
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const year = details.year ? String(details.year).trim() : "";
    const mileage = details.mileage ? String(details.mileage).trim() : "";
    const fuelType = details.fuelType ? String(details.fuelType).trim() : "";
    const color = details.color ? String(details.color).trim() : "";

    // Build description with whatever details we have
    if (brand || model || year || mileage || color) {
      const parts: string[] = [];
      if (year) parts.push(year);
      if (brand) parts.push(brand);
      if (model) parts.push(model);
      enhanced = parts.join(" ");
      
      const specs: string[] = [];
      if (mileage) specs.push(`${mileage}km on the odometer`);
      if (fuelType) specs.push(`runs on ${fuelType.toLowerCase()}`);
      if (color) specs.push(`beautiful ${color.toLowerCase()} color`);
      
      if (specs.length > 0) {
        enhanced += " with " + specs.join(", ");
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.wellMaintained", {
      defaultValue: "Extremely well-maintained and drives like a dream! You won't be disappointed. Ready for many more adventures!",
    });
  } else if (subCategory === "Bicycle") {
    const type = details.type ? String(details.type).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const gear = details.gear ? String(details.gear).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type) {
      enhanced = brand ? `${brand} ${type.toLowerCase()} bicycle` : `${type} bicycle`;
      if (gear) {
        enhanced += ` with ${gear}-speed gearing`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.perfectForCommuting", {
      defaultValue: "Perfect for your daily adventures and staying healthy! Rides smoothly and will serve you well for years to come.",
    });
  } else if (subCategory === "Lorries") {
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const year = details.year ? String(details.year).trim() : "";
    const capacity = details.capacity ? String(details.capacity).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (brand && model) {
      enhanced = year ? `${year} ${brand} ${model} lorry` : `${brand} ${model} lorry`;
      if (capacity) {
        enhanced += ` with ${capacity} ton capacity`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.reliableHeavyDuty", {
      defaultValue: "Built tough for heavy-duty work! Reliable and ready to handle your business needs. A smart investment that pays for itself!",
    });
  } else if (subCategory === "Tractors") {
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const horsepower = details.horsepower ? String(details.horsepower).trim() : "";
    const year = details.year ? String(details.year).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (brand) {
      enhanced = year ? `${year} ${brand}` : brand;
      if (model) enhanced += ` ${model}`;
      enhanced += " tractor";
      if (horsepower) {
        enhanced += ` with ${horsepower} HP`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.powerfulFarming", {
      defaultValue: "Powerful machine perfect for all your farming needs! Dependable performance that gets the job done. Excellent value!",
    });
  } else if (subCategory === "Tuk Tuk & Remork") {
    const brand = getEffectiveValue(details, "brand");
    const year = details.year ? String(details.year).trim() : "";
    const engineSize = details.engineSize ? String(details.engineSize).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (brand) {
      enhanced = year ? `${year} ${brand}` : brand;
      if (engineSize) {
        enhanced += ` ${engineSize} engine`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.greatForBusiness", {
      defaultValue: "Perfect for passenger transport or business deliveries! Reliable and fuel-efficient. Start earning right away!",
    });
  } else if (subCategory === "Parts & Accessories" && (details.vehicleType || details.partType)) {
    // Vehicle Parts & Accessories
    const partType = details.partType ? String(details.partType).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const compatibility = details.compatibility ? String(details.compatibility).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (partType) {
      enhanced = brand ? `${brand} ${partType}` : partType;
      if (compatibility) {
        enhanced += ` compatible with ${compatibility}`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.genuineParts", {
      defaultValue: "High-quality parts that fit perfectly! Get your vehicle running smoothly again. Great price!",
    });
  } else if (subCategory === "Vehicles For Rent") {
    const vehicleType = details.vehicleType ? String(details.vehicleType).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const dailyRate = details.dailyRate ? String(details.dailyRate).trim() : "";
    const monthlyRate = details.monthlyRate ? String(details.monthlyRate).trim() : "";

    if (vehicleType) {
      enhanced = brand ? `${brand} ${vehicleType.toLowerCase()}` : vehicleType;
      enhanced += " available for rent";
      const rates: string[] = [];
      if (dailyRate) rates.push(`$${dailyRate}/day`);
      if (monthlyRate) rates.push(`$${monthlyRate}/month`);
      if (rates.length > 0) {
        enhanced += " at " + rates.join(" or ");
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.convenientRental", {
      defaultValue: "Convenient and affordable rental! Well-maintained and ready to go whenever you need it. Book now!",
    });
  }

  // Beauty (Category 3)
  else if (
    subCategory === "Skin Care" ||
    subCategory === "Hair Care" ||
    subCategory === "Makeup" ||
    subCategory === "Natural & Organic"
  ) {
    const brand = getEffectiveValue(details, "brand");
    const productName = details.productName ? String(details.productName).trim() : "";
    const size = details.size ? String(details.size).trim() : "";

    if (brand || productName) {
      enhanced = brand && productName ? `${brand} ${productName}` : brand || productName;
      if (size) {
        enhanced += ` (${size})`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.authenticBeauty", {
      defaultValue: "100% authentic beauty product that brings out your natural radiance! Treat yourself - you deserve it!",
    });
  }

  // Furniture (Category 4)
  else if (
    subCategory === "Tables & Desks" ||
    subCategory === "Chairs & Sofas" ||
    subCategory === "Wardrobes & Cabinets" ||
    subCategory === "Shelves & Drawers" ||
    subCategory === "Beds & Mattresses"
  ) {
    const material = details.material ? String(details.material).trim() : "";
    const color = details.color ? String(details.color).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";
    const dimensions = details.dimensions ? String(details.dimensions).trim() : "";

    enhanced = material ? `Beautiful ${material.toLowerCase()} furniture` : "Quality furniture piece";
    const features: string[] = [];
    if (color) features.push(`${color.toLowerCase()} finish`);
    if (dimensions) features.push(`dimensions: ${dimensions}`);
    if (condition) features.push(`${condition.toLowerCase()} condition`);
    
    if (features.length > 0) {
      enhanced += " with " + features.join(", ");
    }
    enhanced += ". ";
    enhanced += trimmedDescription || i18n.t("productFormatter.sturdyFurniture", {
      defaultValue: "Beautifully crafted and built to last! Will transform your space and impress your guests. Excellent investment!",
    });
  } else if (subCategory === "Curtain & Carpet") {
    const material = details.material ? String(details.material).trim() : "";
    const color = details.color ? String(details.color).trim() : "";
    const size = details.size ? String(details.size).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    enhanced = material ? `Beautiful ${material.toLowerCase()} curtain or carpet` : "Quality home textile";
    const features: string[] = [];
    if (color) features.push(`${color.toLowerCase()} color`);
    if (size) features.push(`size: ${size}`);
    if (condition) features.push(`${condition.toLowerCase()} condition`);
    
    if (features.length > 0) {
      enhanced += " in " + features.join(", ");
    }
    enhanced += ". ";
    enhanced += trimmedDescription || i18n.t("productFormatter.elegantDecor", {
      defaultValue: "Adds elegance and warmth to any room! Premium quality that transforms your living space beautifully. You'll love it!",
    });
  } else if (subCategory === "Kitchenware") {
    const type = details.type ? String(details.type).trim() : "";
    const material = details.material ? String(details.material).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type) {
      enhanced = brand ? `${brand} ${type}` : type;
      if (material) {
        enhanced += ` made from ${material.toLowerCase()}`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.practicalKitchen", {
      defaultValue: "Essential kitchen item that makes cooking a joy! Durable and practical for everyday use. A must-have!",
    });
  } else if (subCategory === "Household Items") {
    const type = details.type ? String(details.type).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";
    const brand = getEffectiveValue(details, "brand");

    if (type) {
      enhanced = brand ? `${brand} ${type}` : type;
      if (condition) {
        enhanced += ` in ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.usefulHousehold", {
      defaultValue: "Useful household item that simplifies daily life! Great quality and super convenient. You'll use it every day!",
    });
  } else if (subCategory === "Handicrafts-Paintings") {
    const type = details.type ? String(details.type).trim() : "";
    const material = details.material ? String(details.material).trim() : "";
    const dimensions = details.dimensions ? String(details.dimensions).trim() : "";
    const style = details.style ? String(details.style).trim() : "";

    if (type) {
      enhanced = material ? `${material} ${type.toLowerCase()}` : type;
      const features: string[] = [];
      if (style) features.push(`${style.toLowerCase()} style`);
      if (dimensions) features.push(`size: ${dimensions}`);
      
      if (features.length > 0) {
        enhanced += " in " + features.join(", ");
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.uniqueArtwork", {
      defaultValue: "Unique and beautiful artwork that adds character to your space! Expertly crafted with attention to detail. A true treasure!",
    });
  }

  // Clothing (Category 5)
  else if (
    subCategory === "Women's Fashion" ||
    subCategory === "Men's Fashion" ||
    subCategory === "Baby & Kids"
  ) {
    const type = details.type ? String(details.type).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const size = details.size ? String(details.size).trim() : "";
    const color = details.color ? String(details.color).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type) {
      enhanced = brand ? `${brand} ${type}` : type;
      const details_arr: string[] = [];
      if (size) details_arr.push(`size ${size}`);
      if (color) details_arr.push(`${color.toLowerCase()} color`);
      if (condition) details_arr.push(`${condition.toLowerCase()} condition`);
      
      if (details_arr.length > 0) {
        enhanced += " in " + details_arr.join(", ");
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.stylishComfortable", {
      defaultValue: "Incredibly stylish and comfortable! Perfect for any occasion and will quickly become your favorite. Amazing deal!",
    });
  } else if (subCategory === "Fashion Accessories") {
    const type = details.type ? String(details.type).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const material = details.material ? String(details.material).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type) {
      enhanced = brand ? `${brand} ${type}` : type;
      if (material) {
        enhanced += ` made from ${material.toLowerCase()}`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.fashionableAccessory", {
      defaultValue: "The perfect accessory to complete your look! Stylish and versatile, adds that special touch to any outfit. You'll love it!",
    });
  }

  // Computers (Category 6)
  else if (subCategory === "Laptop" || subCategory === "Desktop" || subCategory === "All in One") {
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const processor = details.processor ? String(details.processor).trim() : "";
    const ram = getEffectiveValue(details, "ram");
    const storage = getEffectiveValue(details, "storage");
    const condition = details.condition ? String(details.condition).trim() : "";

    // Build description with whatever details we have
    if (brand || model || processor || ram || storage) {
      enhanced = "";
      if (brand) enhanced += brand;
      if (model) enhanced += ` ${model}`;
      
      const specs: string[] = [];
      if (processor) specs.push(`powered by ${processor}`);
      if (ram) specs.push(`${ram} RAM`);
      if (storage) specs.push(`${storage} storage`);
      
      if (specs.length > 0) {
        enhanced += " " + specs.join(", ");
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.fastReliable", {
      defaultValue: "Lightning-fast performance that handles everything effortlessly! Perfect for work, creativity, and entertainment. You'll be amazed!",
    });
  } else if (subCategory === "Monitor Printer & Scanner") {
    const type = details.type ? String(details.type).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type || brand) {
      enhanced = "";
      if (brand) enhanced += brand;
      if (model) enhanced += ` ${model}`;
      if (type) enhanced += enhanced ? ` ${type}` : type;
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.essentialPeripheral", {
      defaultValue: "Essential computer peripheral with excellent performance! Reliable and easy to use for all your needs. Great addition!",
    });
  } else if (subCategory === "Parts & Accessories" && !(details.vehicleType || details.partType)) {
    // Computer Parts & Accessories
    const type = details.type ? String(details.type).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const compatibility = details.compatibility ? String(details.compatibility).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type || brand) {
      enhanced = "";
      if (brand) enhanced += brand;
      if (type) enhanced += enhanced ? ` ${type}` : type;
      if (compatibility) {
        enhanced += ` compatible with ${compatibility}`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.upgradeYourPC", {
      defaultValue: "Upgrade your computer with quality parts! Reliable components that improve performance instantly. Smart choice!",
    });
  }

  // Real Estate (Category 7)
  else if (subCategory === "House" || subCategory === "Condo" || subCategory === "Apartment") {
    const bedrooms = details.bedrooms ? String(details.bedrooms).trim() : "";
    const bathrooms = details.bathrooms ? String(details.bathrooms).trim() : "";
    const area = details.area ? String(details.area).trim() : "";
    const furnished = details.furnished ? String(details.furnished).trim() : "";

    // Build description with whatever details we have
    if (bedrooms || bathrooms || area || furnished) {
      enhanced = "This property features ";
      const features: string[] = [];
      if (bedrooms) features.push(`${bedrooms} bedroom${bedrooms !== "1" ? "s" : ""}`);
      if (bathrooms) features.push(`${bathrooms} bathroom${bathrooms !== "1" ? "s" : ""}`);
      if (area) features.push(`${area} square meters of living space`);
      
      enhanced += features.join(", ");
      if (furnished) {
        enhanced += ` and comes ${furnished.toLowerCase()}`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.perfectLiving", {
      defaultValue: "Your dream home awaits! Stunning location with everything you need for the perfect lifestyle. Don't miss this opportunity!",
    });
  } else if (subCategory === "Land") {
    const area = details.area ? String(details.area).trim() : "";
    const landTitle = details.landTitle ? String(details.landTitle).trim() : "";
    const width = details.width ? String(details.width).trim() : "";
    const length = details.length ? String(details.length).trim() : "";

    if (area) {
      enhanced = `${area} square meters of land`;
      if (width && length) {
        enhanced += ` (${width}m × ${length}m)`;
      }
      if (landTitle) {
        enhanced += ` with ${landTitle}`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.primeLand", {
      defaultValue: "Incredible investment opportunity in a prime location! Perfect for development with amazing potential. Smart buyers act fast!",
    });
  } else if (subCategory === "Commercial") {
    const propertyType = details.propertyType ? String(details.propertyType).trim() : "";
    const area = details.area ? String(details.area).trim() : "";
    const floors = details.floors ? String(details.floors).trim() : "";
    const parking = details.parking ? String(details.parking).trim() : "";

    if (propertyType || area) {
      enhanced = propertyType ? `${propertyType} commercial property` : "Commercial property";
      const features: string[] = [];
      if (area) features.push(`${area} square meters`);
      if (floors) features.push(`${floors} floor${floors !== "1" ? "s" : ""}`);
      if (parking) features.push(`parking for ${parking} vehicles`);
      
      if (features.length > 0) {
        enhanced += " with " + features.join(", ");
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.businessOpportunity", {
      defaultValue: "Fantastic business opportunity in an excellent location! High visibility and great potential for success. Don't miss out!",
    });
  }

  // Electronics & Appliances (Category 8)
  else if (
    subCategory === "Washing Machines" ||
    subCategory === "Fridges" ||
    subCategory === "Air Conditioning"
  ) {
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const capacity = details.capacity ? String(details.capacity).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    // Build description with whatever details we have
    if (brand || model || capacity) {
      enhanced = "";
      if (brand) enhanced += brand;
      if (model) enhanced += ` ${model}`;
      
      if (capacity) {
        const unit = subCategory === "Fridges" ? "L capacity" : subCategory === "Washing Machines" ? "kg load" : "BTU";
        enhanced += ` with ${capacity}${unit}`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.energyEfficient", {
      defaultValue: "Super efficient and reliable! Saves you money while delivering outstanding performance. A smart choice you'll appreciate daily!",
    });
  } else if (subCategory === "Tools") {
    const toolType = details.toolType ? String(details.toolType).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const powerSource = details.powerSource ? String(details.powerSource).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (toolType) {
      enhanced = brand ? `${brand} ${toolType}` : toolType;
      if (powerSource) {
        enhanced += ` (${powerSource.toLowerCase()})`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.professionalTool", {
      defaultValue: "Professional-grade tool that gets the job done right! Durable and reliable for all your projects. Essential for any toolbox!",
    });
  } else if (subCategory === "Machinery") {
    const type = details.type ? String(details.type).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const model = details.model ? String(details.model).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type || brand) {
      enhanced = "";
      if (brand) enhanced += brand;
      if (model) enhanced += ` ${model}`;
      if (type) enhanced += enhanced ? ` ${type}` : type;
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.industrialMachinery", {
      defaultValue: "Heavy-duty machinery built for serious work! Dependable and efficient for industrial applications. Excellent investment!",
    });
  } else if (subCategory === "Security Camera") {
    const brand = getEffectiveValue(details, "brand");
    const resolution = details.resolution ? String(details.resolution).trim() : "";
    const model = details.model ? String(details.model).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (brand) {
      enhanced = model ? `${brand} ${model} security camera` : `${brand} security camera`;
      if (resolution) {
        enhanced += ` with ${resolution} resolution`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.advancedSecurity", {
      defaultValue: "Advanced security system that keeps your property safe! Crystal-clear footage and reliable monitoring. Peace of mind guaranteed!",
    });
  } else if (subCategory === "TVs & Audio") {
    const brand = getEffectiveValue(details, "brand");
    const screenSize = details.screenSize ? String(details.screenSize).trim() : "";
    const model = details.model ? String(details.model).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";

    if (brand) {
      enhanced = model ? `${brand} ${model}` : brand;
      if (screenSize) {
        enhanced += ` ${screenSize}" screen`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.entertainmentExperience", {
      defaultValue: "Amazing entertainment experience with stunning picture and sound! Perfect for movies, sports, and gaming. You'll be blown away!",
    });
  } else if (subCategory === "Video games") {
    const platform = details.platform ? String(details.platform).trim() : "";
    const gameName = details.gameName ? String(details.gameName).trim() : "";
    const condition = details.condition ? String(details.condition).trim() : "";
    const genre = details.genre ? String(details.genre).trim() : "";

    if (gameName || platform) {
      enhanced = gameName ? gameName : `Video game`;
      if (platform) {
        enhanced += ` for ${platform}`;
      }
      if (genre) {
        enhanced += ` (${genre.toLowerCase()})`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.gamingFun", {
      defaultValue: "Hours of entertainment and fun! Engaging gameplay that you'll love. Great addition to your collection!",
    });
  } else if (subCategory === "Toys") {
    const type = details.type ? String(details.type).trim() : "";
    const ageRange = details.ageRange ? String(details.ageRange).trim() : "";
    const brand = getEffectiveValue(details, "brand");
    const condition = details.condition ? String(details.condition).trim() : "";

    if (type) {
      enhanced = brand ? `${brand} ${type}` : type;
      if (ageRange) {
        enhanced += ` (suitable for ages ${ageRange})`;
      }
      if (condition) {
        enhanced += `, ${condition.toLowerCase()} condition`;
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.funToy", {
      defaultValue: "Fun and engaging toy that sparks imagination! Safe, entertaining, and perfect for play. Kids will absolutely love it!",
    });
  }

  // Generic fallback for any remaining categories
  else {
    const meaningfulFields = Object.entries(details)
      .filter(([key, v]) => key !== "description" && key !== "title" && v && String(v).trim().length > 0)
      .slice(0, 3);
    
    if (meaningfulFields.length > 0) {
      enhanced = "Quality product";
      const values = meaningfulFields.map(([_, v]) => String(v).trim());
      if (values.length > 0) {
        enhanced += " featuring " + values.join(", ");
      }
      enhanced += ". ";
    }
    enhanced += trimmedDescription || i18n.t("productFormatter.qualityProduct", {
      defaultValue: "Excellent quality in fantastic condition! Exactly what you've been looking for. Grab this deal before it's gone!",
    });
  }

  // Clean up the enhanced description
  enhanced = enhanced
    .replace(/\s+/g, " ") 
    .replace(/\s+\./g, ".") 
    .replace(/\.\s*\./g, ".") 
    .trim();
  
  // Show suggestion if we have meaningful generated content
  const shouldShow = 
    enhanced.length > 20 &&  // Has substantial content
    enhanced !== trimmedDescription &&  // Different from user's current text
    (trimmedDescription.length === 0 ||  // User hasn't written anything yet
     isGeneric ||  // User wrote generic description
     trimmedDescription.length < 50 ||  // User wrote very short description
     enhanced.length > trimmedDescription.length + 30);  // Our suggestion is significantly longer

  return {
    isGeneric,
    suggested: enhanced,
    shouldShow,
  };
}
