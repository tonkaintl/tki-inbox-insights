import mongoose, { Document, Schema } from "mongoose";

// Email Address Schema for nested objects
const EmailAddressSchema = new Schema(
  {
    address: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

// Email Body Schema for nested objects
const EmailBodySchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    content_type: {
      type: String,
      enum: ["text/plain", "text/html"],
      default: "text/html",
    },
  },
  { _id: false }
);

// Email From Schema for nested objects
const EmailFromSchema = new Schema(
  {
    email_address: {
      type: EmailAddressSchema,
      required: true,
    },
  },
  { _id: false }
);

// Main Email Document Interface
export interface IEmail extends Document {
  id: string;
  subject: string;
  from: {
    email_address: {
      address: string;
      name?: string;
    };
  };
  body: {
    content: string;
    content_type: "text/plain" | "text/html";
  };
  received_date_time: string;
  body_preview?: string;
  folder_id: string;
  created_at: Date;
  updated_at: Date;
}

// Email Schema with snake_case field names
const EmailSchema = new Schema<IEmail>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    from: {
      type: EmailFromSchema,
      required: true,
    },
    body: {
      type: EmailBodySchema,
      required: true,
    },
    received_date_time: {
      type: String,
      required: true,
    },
    body_preview: {
      type: String,
      trim: true,
    },
    folder_id: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Extracted Link Schema for nested objects
const ExtractedLinkSchema = new Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "news",
        "tutorial",
        "vendor",
        "community",
        "tool",
        "sponsor",
        "product",
        "other",
      ],
    },
  },
  { _id: false }
);

// Parsed Newsletter Document Interface
export interface IParsedNewsletter extends Document {
  id: string;
  email_id: string;
  sender: string;
  subject: string;
  date: string;
  parser_used: string;
  links: Array<{
    url: string;
    text: string;
    section: string;
    category:
      | "news"
      | "tutorial"
      | "vendor"
      | "community"
      | "tool"
      | "sponsor"
      | "product"
      | "other";
  }>;
  parsed_at: Date;
  version: string;
  created_at: Date;
  updated_at: Date;
}

// Parsed Newsletter Schema with snake_case field names
const ParsedNewsletterSchema = new Schema<IParsedNewsletter>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email_id: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    parser_used: {
      type: String,
      required: true,
      trim: true,
    },
    links: {
      type: [ExtractedLinkSchema],
      required: true,
      validate: {
        validator: function (links: unknown[]) {
          return Array.isArray(links) && links.length > 0;
        },
        message: "At least one link is required",
      },
    },
    parsed_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    version: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Create additional indexes for better query performance (avoiding duplicates)
EmailSchema.index({ "from.email_address.address": 1 });
EmailSchema.index({ received_date_time: -1 });
// folder_id already has index: true in schema

ParsedNewsletterSchema.index({ sender: 1 });
ParsedNewsletterSchema.index({ parsed_at: -1 });
// email_id already has index: true in schema

// Curated Link Document Interface for link management and review
export interface ICuratedLink extends Document {
  id: string;
  url: string;
  text: string;
  domain: string;
  resolved_url?: string;
  category:
    | "news"
    | "tutorial"
    | "vendor"
    | "community"
    | "tool"
    | "sponsor"
    | "product"
    | "other";
  section: string;
  count: number;
  newsletters: string[]; // Array of newsletter subjects
  reviewed: boolean;
  flagged: boolean;
  notes?: string;
  first_seen: Date;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

// Resolved URL Document Interface for caching URL resolutions
export interface IResolvedUrl extends Document {
  original_url: string;
  resolved_url: string;
  status: "resolved" | "no_redirect" | "failed" | "timeout";
  attempts: number;
  last_attempt: Date;
  created_at: Date;
  updated_at: Date;
}

// Resolved URL Schema
const ResolvedUrlSchema = new Schema<IResolvedUrl>(
  {
    original_url: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    resolved_url: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["resolved", "failed", "timeout", "no_redirect"],
      default: "resolved",
    },
    attempts: {
      type: Number,
      required: true,
      default: 1,
    },
    last_attempt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Curated Link Schema
const CuratedLinkSchema = new Schema<ICuratedLink>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resolved_url: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "news",
        "tutorial",
        "vendor",
        "community",
        "tool",
        "sponsor",
        "product",
        "other",
      ],
      index: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    count: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    newsletters: {
      type: [String],
      required: true,
      validate: {
        validator: function (newsletters: string[]) {
          return Array.isArray(newsletters) && newsletters.length > 0;
        },
        message: "At least one newsletter is required",
      },
    },
    reviewed: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    flagged: {
      type: Boolean,
      required: true,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
    },
    first_seen: {
      type: Date,
      required: true,
      default: Date.now,
    },
    last_seen: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Create indexes for better query performance
ResolvedUrlSchema.index({ status: 1 });
ResolvedUrlSchema.index({ last_attempt: -1 });

CuratedLinkSchema.index({ domain: 1, reviewed: 1 });
CuratedLinkSchema.index({ flagged: 1 });
CuratedLinkSchema.index({ first_seen: -1 });
CuratedLinkSchema.index({ last_seen: -1 });

// Broadcast Item Document Interface
export interface IBroadcastItem extends Document {
  id: string;
  message_id: string; // Unique email Message-ID header
  subject: string;
  sender: string;
  received_date: string;
  full_text: string;
  stock_number: string | null; // STK# from the broadcast
  machine_info: string[]; // Specs like engine, transmission, miles, condition
  machine_url: string | null; // Link to the machine listing on tonkaintl.com
  price: string | null;
  location: string | null;
  images: string[];
  completed: boolean;
  parsed_at: Date;
  raw_html: string;
  created_at: Date;
  updated_at: Date;
}

// Broadcast Item Schema
const BroadcastItemSchema = new Schema<IBroadcastItem>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    message_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    sender: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    received_date: {
      type: String,
      required: true,
    },
    full_text: {
      type: String,
      required: true,
    },
    stock_number: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    machine_info: {
      type: [String],
      required: true,
      default: [],
    },
    machine_url: {
      type: String,
      trim: true,
      default: null,
    },
    price: {
      type: String,
      trim: true,
      default: null,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    images: {
      type: [String],
      required: true,
      default: [],
    },
    completed: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    parsed_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    raw_html: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Create indexes for better query performance
BroadcastItemSchema.index({ sender: 1 });
BroadcastItemSchema.index({ received_date: -1 });
BroadcastItemSchema.index({ parsed_at: -1 });

// Export models with snake_case collection names
export const Email =
  mongoose.models.emails || mongoose.model<IEmail>("emails", EmailSchema);

export const ParsedNewsletter =
  mongoose.models.parsed_newsletters ||
  mongoose.model<IParsedNewsletter>(
    "parsed_newsletters",
    ParsedNewsletterSchema
  );

export const ResolvedUrl =
  mongoose.models.resolved_urls ||
  mongoose.model<IResolvedUrl>("resolved_urls", ResolvedUrlSchema);

export const CuratedLink =
  mongoose.models.curated_links ||
  mongoose.model<ICuratedLink>("curated_links", CuratedLinkSchema);

export const BroadcastItem =
  mongoose.models.broadcast_items ||
  mongoose.model<IBroadcastItem>("broadcast_items", BroadcastItemSchema);
