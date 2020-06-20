// Type definitions for mt940js
// BETA !, PRs welcomed !

declare namespace mt940js {
    declare class BankDate {
        static parse(year: string, month: string, day: string): Date;
    }

    declare enum DCMark {
        D = 'D',
        C = 'C',
        RD = 'RD',
        RC = 'RC',
    }

    interface StringMap { [key: string]: string }
    type StructuredField86 = StringMap;

    declare class BankAmount {
        static parse(dcmark: DCMark, amountStr: string): number;
        static isEqual(a: number, b: number): boolean;
    }

    type TagID = string | number;
    declare class Tag {
        static get ID(): TagID;
        static get PATTERN(): RegExp;
        constructor(data: string);
        data: string;
        fields: StringMap;
    }

    interface StatementNumber {
        statement: string;
        sequence?: string;
        section?: string;
    }
    interface StatementTransaction {
        date: Date;
        amount: number;
        isReversal: boolean;
        currency: string;
        details: string;
        transactionType: string;
        reference: string;
        entryDate?: Date;
        fundsCode?: string;
        bankReference?: string;
        extraDetails?: string;
        structuredDetails?: StructuredField86;
        nonSwift?: string;
    }

    interface Statement {
        transactionReference: string;
        relatedReference: string;
        accountIdentification: string;
        number: StatementNumber;
        openingBalanceDate: Date;
        closingBalanceDate: Date;
        closingAvailableBalanceDate: Date;
        forwardAvailableBalanceDate: Date;
        statementDate: Date;
        currency: string
        openingBalance: number;
        closingBalance: number;
        closingAvailableBalance: number;
        forwardAvailableBalance: number;
        informationToAccountOwner: string;
        messageBlocks: any; // EXPERIMENTAL
        transactions: StatementTransaction[];
    }
    interface NextFunction {
        (): void;
    }
    interface postParseMiddlewareCb {
        (statement: Statement, next: NextFunction): Statement;
    }

    interface ParserParams {
        no86Structure ?: boolean;
    }
    declare class Parser {
        constructor(params: ParserParams);
        parse(data: string, withTags: boolean = false): Statement[];
        usePostParse(fn: postParseMiddlewareCb): void;
    }

}
