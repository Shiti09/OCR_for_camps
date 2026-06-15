export type Sex = "M" | "F" | "Other" | "";

export interface PatientRow {
  id: string;
  sr_no: string;
  patient_name: string;
  age: string;
  sex: Sex;
  contact_number: string;
  diabetes: string;
  camp_location: string;
  camp_date: string;
  remarks: string;
}

export interface OCRResponse {
  rows: PatientRow[];
  meta: {
    engine: string;
    elapsed_ms: number;
    confidence: number;
  };
}

export const REMARK_OPTIONS = [
  "Cataract",
  "Glasses",
  "Normal",
  "Diabetic",
  "Retina",
  "Referral",
];

export const SEX_OPTIONS: Sex[] = ["M", "F", "Other"];
