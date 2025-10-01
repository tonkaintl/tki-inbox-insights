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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
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
      enum: ["news", "tutorial", "vendor", "community", "tool", "sponsor", "product", "other"],
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
    category: "news" | "tutorial" | "vendor" | "community" | "tool" | "sponsor" | "product" | "other";
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
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Create indexes for better query performance
EmailSchema.index({ "from.email_address.address": 1 });
EmailSchema.index({ received_date_time: -1 });
EmailSchema.index({ folder_id: 1 });

ParsedNewsletterSchema.index({ sender: 1 });
ParsedNewsletterSchema.index({ parsed_at: -1 });
ParsedNewsletterSchema.index({ email_id: 1 });

// Export models with snake_case collection names
export const Email =
  mongoose.models.emails || mongoose.model<IEmail>("emails", EmailSchema);

export const ParsedNewsletter =
  mongoose.models.parsed_newsletters ||
  mongoose.model<IParsedNewsletter>("parsed_newsletters", ParsedNewsletterSchema);
