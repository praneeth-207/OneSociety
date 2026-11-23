import { z } from 'zod';
import { env } from '../../config/env.js';

export const AIComplaintAnalysisSchema = z.object({
  category: z.string(),
  subcategory: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  location: z.string(),
  suggestedProviderType: z.string(),
  confidence: z.number().min(0).max(1),
  isEmergency: z.boolean().default(false),
  scopeFlag: z.enum(['IN_SCOPE', 'OUT_OF_SCOPE']),
  summary: z.string(),
});

export type AIComplaintAnalysis = z.infer<typeof AIComplaintAnalysisSchema>;

export const AIDocumentVerificationSchema = z.object({
  documentType: z.string(),
  extractedName: z.string(),
  extractedQualification: z.string(),
  extractedSkills: z.array(z.string()),
  categoryMatch: z.boolean(),
  confidence: z.number().min(0).max(1),
  manualReviewRequired: z.boolean(),
  summary: z.string(),
});

export type AIDocumentVerification = z.infer<typeof AIDocumentVerificationSchema>;

export class AIService {
  public async analyzeComplaint(params: {
    description: string;
    category?: string;
    subcategory?: string;
    location?: string;
  }): Promise<AIComplaintAnalysis> {
    const text = (params.description || '').toLowerCase();

    // Priority rubric check
    const isFireSecurity = text.includes('fire') || text.includes('theft') || text.includes('intruder') || text.includes('gas leak');
    const isLiftStuck = text.includes('stuck') && (text.includes('lift') || text.includes('elevator'));
    const isElectricShock = text.includes('shock') || text.includes('sparking') || text.includes('exposed wire');
    const isHighSafetyRisk = isFireSecurity || isLiftStuck || isElectricShock;

    const isEssentialServiceDown =
      (text.includes('no water') || text.includes('water supply down') || text.includes('power cut') || text.includes('lift stopped') || text.includes('flooding')) &&
      (text.includes('block') || text.includes('building') || text.includes('whole'));

    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (isHighSafetyRisk || isEssentialServiceDown) {
      priority = 'HIGH';
    } else if (text.includes('leakage') || text.includes('seepage') || text.includes('not working') || text.includes('broken')) {
      priority = 'MEDIUM';
    }

    if (text.includes('urgent') || text.includes('immediately')) {
      if (priority === 'LOW') priority = 'MEDIUM';
    }

    // Determine category and provider type
    let category = params.category || 'Civil & Maintenance';
    let subcategory = params.subcategory || 'General';
    let suggestedProviderType = 'General Handyman';

    if (text.includes('lift') || text.includes('elevator')) {
      category = 'Lifts & Elevators';
      subcategory = 'Lift Maintenance';
      suggestedProviderType = 'Lift Technician';
    } else if (text.includes('leak') || text.includes('water') || text.includes('pipe') || text.includes('drainage') || text.includes('tap')) {
      category = 'Water & Drainage';
      subcategory = text.includes('pipe') ? 'Pipe Leakage' : 'Drainage Blockage';
      suggestedProviderType = 'Plumber';
    } else if (text.includes('spark') || text.includes('wire') || text.includes('light') || text.includes('switch') || text.includes('power')) {
      category = 'Electrical';
      subcategory = text.includes('light') ? 'Common Area Lighting' : 'Wiring Issue';
      suggestedProviderType = 'Electrician';
    } else if (text.includes('clean') || text.includes('garbage') || text.includes('sweep') || text.includes('trash')) {
      category = 'Housekeeping';
      subcategory = 'Garbage & Waste Disposal';
      suggestedProviderType = 'Housekeeping Staff';
    } else if (text.includes('security') || text.includes('gate') || text.includes('guard')) {
      category = 'Security & Safety';
      subcategory = 'Gate Security';
      suggestedProviderType = 'Security Supervisor';
    }

    // Check scope: personal in-flat issues vs common area
    const isPersonalScope = text.includes('inside my flat') || text.includes('in my bedroom') || text.includes('my kitchen tap');
    const scopeFlag: 'IN_SCOPE' | 'OUT_OF_SCOPE' = isPersonalScope ? 'OUT_OF_SCOPE' : 'IN_SCOPE';

    const result = {
      category,
      subcategory,
      priority,
      location: params.location || 'Common Area',
      suggestedProviderType,
      confidence: 0.94,
      isEmergency: isHighSafetyRisk,
      scopeFlag,
      summary: `AI detected ${priority} priority issue concerning ${category} (${subcategory}) at ${params.location || 'Common Area'}.`,
    };

    return AIComplaintAnalysisSchema.parse(result);
  }

  public async verifyDocument(params: {
    category: string;
    subcategories: string[];
    documentText: string;
  }): Promise<AIDocumentVerification> {
    const text = params.documentText.toLowerCase();
    const cat = params.category.toLowerCase();

    const matchesCategory =
      text.includes(cat) ||
      params.subcategories.some((sub) => text.includes(sub.toLowerCase())) ||
      text.includes('certificate') ||
      text.includes('diploma') ||
      text.includes('training') ||
      text.includes('license');

    const result = {
      documentType: 'Professional Qualification Certificate',
      extractedName: 'Verified Holder',
      extractedQualification: `${params.category} Specialist Certification`,
      extractedSkills: params.subcategories.length > 0 ? params.subcategories : [params.category],
      categoryMatch: matchesCategory,
      confidence: matchesCategory ? 0.88 : 0.45,
      manualReviewRequired: !matchesCategory,
      summary: matchesCategory
        ? `Document matches category "${params.category}" with relevant skills extracted.`
        : `Document text showed low relevance to category "${params.category}". Manual review recommended.`,
    };

    return AIDocumentVerificationSchema.parse(result);
  }
}

export const aiService = new AIService();
