import {
  ArrowRightCircle,
  Calendar,
  FileText,
  Hash,
  ToggleLeft,
  Type
} from "lucide-react";
import {
  AggregationFunction,
  DerivationRule,
  DerivationType,
  PropertyDefinition,
  ValueKind,
} from "../../api/graphql";

export type { PropertyDefinition };

export const DEFAULT_DERIVATION = DerivationType.Latest
export const DEFAULT_AGGREGATION = AggregationFunction.Latest

/**
 * Anything rule-shaped: the read type, the input type, or a partial being
 * edited. The read type makes the priority lists required and the input type
 * makes every field nullable, so neither one alone can describe both ends of a
 * form that loads from the first and submits to the second.
 */
export type DerivationRuleLike = {
  [K in keyof Omit<DerivationRule, "__typename">]?: DerivationRule[K] | null;
};

/**
 * `subjectPriority` and `toolPriority` are required on the read type; these
 * mirror the server-side input defaults.
 *
 * `evidence` is carried through untouched. It replaced `conflictPolicy` and is
 * a rule list saying *which* measurements this property folds; no editor
 * writes one yet, and a save is a full replace, so dropping it here would wipe
 * a rule set the server holds.
 */
export const buildDerivationRule = (
  rule?: DerivationRuleLike | null,
): DerivationRule => ({
  aggregation: rule?.aggregation || DEFAULT_AGGREGATION,
  evidence: rule?.evidence,
  subjectPriority: rule?.subjectPriority ?? [],
  toolPriority: rule?.toolPriority ?? [],
  key: rule?.key,
  sourceNode: rule?.sourceNode,
  sourceValueKind: rule?.sourceValueKind,
})

export interface DataTypeConfig {
  icon: React.ComponentType<{ className?: string }>
  color: {
    bg: string
    text: string
    border: string
  }
  label: string
}

export const dataTypeConfigs: Partial<Record<ValueKind, DataTypeConfig>> = {
  [ValueKind.String]: {
    icon: Type,
    color: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    label: 'String'
  },
  [ValueKind.Int]: {
    icon: Hash,
    color: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200'
    },
    label: 'Integer'
  },
  [ValueKind.Float]: {
    icon: Hash,
    color: {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200'
    },
    label: 'Float'
  },
  [ValueKind.Boolean]: {
    icon: ToggleLeft,
    color: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200'
    },
    label: 'Boolean'
  },
  [ValueKind.Datetime]: {
    icon: Calendar,
    color: {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200'
    },
    label: 'Date/Time'
  },
  [ValueKind.Category]: {
    icon: FileText,
    color: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200'
    },
    label: 'Category'
  },
  [ValueKind.OneDVector]: {
    icon: ArrowRightCircle,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    label: '1D Vector'
  },
  [ValueKind.TwoDVector]: {
    icon: ArrowRightCircle,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    label: '2D Vector'
  },
  [ValueKind.ThreeDVector]: {
    icon: ArrowRightCircle,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    label: '3D Vector'
  },
  [ValueKind.FourDVector]: {
    icon: ArrowRightCircle,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    label: '4D Vector'
  },
  [ValueKind.NVector]: {
    icon: ArrowRightCircle,
    color: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200'
    },
    label: 'N-D Vector'
  }
}

// Generate a deterministic color from a string (for type cards)
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = hash % 360
  return `hsl(${hue}, 70%, 92%)` // Pastel color
}

// Convert camelCase/PascalCase to snake_case
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

// Validate machine key format
export function isValidMachineKey(key: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(key)
}

// Validation functions for react-hook-form
export const propertyValidation = {
  label: {
    required: 'Display name is required',
    minLength: {
      value: 1,
      message: 'Display name must be at least 1 character'
    },
    maxLength: {
      value: 100,
      message: 'Display name must be at most 100 characters'
    }
  },
  key: {
    required: 'Machine key is required',
    validate: {
      validFormat: (value: string) =>
        isValidMachineKey(value) ||
        'Key must start with a letter and contain only lowercase letters, numbers, and underscores',
      notEmpty: (value: string) => value.trim().length > 0 || 'Key cannot be empty'
    },
    minLength: {
      value: 1,
      message: 'Key must be at least 1 character'
    },
    maxLength: {
      value: 64,
      message: 'Key must be at most 64 characters'
    }
  },
  description: {
    maxLength: {
      value: 500,
      message: 'Description must be at most 500 characters'
    }
  }
}

// Validate entire schema for duplicate keys and other cross-field issues
export function validateSchema(properties: PropertyDefinition[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Check for duplicate keys
  const keys = properties.map((p) => p.key)
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index)
  if (duplicates.length > 0) {
    errors.push(`Duplicate keys found: ${[...new Set(duplicates)].join(', ')}`)
  }

  // Check that all properties have valid keys
  const invalidKeys = properties.filter((p) => !isValidMachineKey(p.key))
  if (invalidKeys.length > 0) {
    errors.push(`Invalid keys found: ${invalidKeys.map((p) => p.key).join(', ')}`)
  }

  // Check that all properties have labels
  const missingLabels = properties.filter((p) => !p.label || p.label.trim() === '')
  if (missingLabels.length > 0) {
    errors.push(`Properties missing labels: ${missingLabels.map((p) => p.key).join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
