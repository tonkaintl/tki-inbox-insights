import {
  AccountInfo,
  AuthenticationResult,
  IPublicClientApplication,
} from "@azure/msal-browser";

interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
}

interface Message {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  receivedDateTime: string;
  isRead: boolean;
  bodyPreview: string;
  webLink: string;
}

interface GraphResponse<T> {
  value: T[];
}

export class GraphService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async callGraphAPI<T>(endpoint: string): Promise<GraphResponse<T>> {
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${this.accessToken}`);
    headers.append("Content-Type", "application/json");

    try {
      const response = await fetch(
        `https://graph.microsoft.com/v1.0${endpoint}`,
        {
          method: "GET",
          headers: headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Graph API call failed:", error);
      throw error;
    }
  }

  async getUserProfile() {
    return this.callGraphAPI("/me");
  }

  async getMailFolders(): Promise<MailFolder[]> {
    const response = await this.callGraphAPI<MailFolder>("/me/mailFolders");
    return response.value;
  }

  async getChildFolders(parentFolderId: string): Promise<MailFolder[]> {
    const response = await this.callGraphAPI<MailFolder>(
      `/me/mailFolders/${parentFolderId}/childFolders`
    );
    return response.value;
  }

  async getMessages(folderId: string, top: number = 25): Promise<Message[]> {
    const response = await this.callGraphAPI<Message>(
      `/me/mailFolders/${folderId}/messages?$top=${top}&$select=id,subject,from,receivedDateTime,isRead,bodyPreview,webLink&$orderby=receivedDateTime desc`
    );
    return response.value;
  }

  async getAllMessages(folderId: string): Promise<Message[]> {
    const allMessages: Message[] = [];
    let nextLink:
      | string
      | null = `/me/mailFolders/${folderId}/messages?$top=999&$select=id,subject,from,receivedDateTime,isRead,bodyPreview,webLink&$orderby=receivedDateTime desc`;

    while (nextLink) {
      try {
        const headers = new Headers();
        headers.append("Authorization", `Bearer ${this.accessToken}`);
        headers.append("Content-Type", "application/json");

        const url: string = nextLink.startsWith("http")
          ? nextLink
          : `https://graph.microsoft.com/v1.0${nextLink}`;

        const response: Response = await fetch(url, {
          method: "GET",
          headers: headers,
        });

        if (!response.ok) {
          console.error(
            `Graph API error: ${response.status} ${response.statusText}`
          );
          break;
        }

        const data: GraphResponse<Message> & { "@odata.nextLink"?: string } =
          await response.json();
        allMessages.push(...data.value);

        // Check for next page
        nextLink = data["@odata.nextLink"] || null;

        console.log(
          `📄 Retrieved ${data.value.length} messages (total: ${allMessages.length})`
        );

        // Add small delay to avoid rate limiting
        if (nextLink) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error("Error fetching messages page:", error);
        break;
      }
    }

    console.log(`✅ Total messages retrieved: ${allMessages.length}`);
    return allMessages;
  }

  async searchMessages(query: string, top: number = 25): Promise<Message[]> {
    const encodedQuery = encodeURIComponent(query);
    const response = await this.callGraphAPI<Message>(
      `/me/messages?$search="${encodedQuery}"&$top=${top}&$select=id,subject,from,receivedDateTime,isRead,bodyPreview,webLink&$orderby=receivedDateTime desc`
    );
    return response.value;
  }

  async getFullMessage(messageId: string): Promise<
    Message & {
      body: { contentType: string; content: string };
      internetMessageId: string;
    }
  > {
    // For single messages, Graph API returns the object directly, not in a value array
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=id,subject,from,receivedDateTime,isRead,body,bodyPreview,webLink,internetMessageId`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  static async getAccessToken(
    instance: IPublicClientApplication,
    account: AccountInfo
  ): Promise<string> {
    const request = {
      scopes: [
        "https://graph.microsoft.com/Mail.Read",
        "https://graph.microsoft.com/Mail.ReadBasic",
      ],
      account: account,
    };

    try {
      const response: AuthenticationResult = await instance.acquireTokenSilent(
        request
      );
      return response.accessToken;
    } catch (error) {
      console.error("Silent token acquisition failed:", error);
      const response: AuthenticationResult = await instance.acquireTokenPopup(
        request
      );
      return response.accessToken;
    }
  }
}
