import { PageHelp } from "@/core/layout/help";

/**
 * bank's page instructions, one per page, shown in the page's Help tab
 * (`help={BANK_HELP.accounts}`). Each names only what its page really offers:
 * the button labels, menu entries and dialogs are the ones on screen.
 */
export const BANK_HELP = {
  home: (
    <PageHelp
      intro="The overview of your money: what you have, what came in and went out this month, and what needs a look. Before any bank is linked, this page only offers to link one."
      steps={[
        <>Press <b>Link bank</b> to connect a bank or broker. You give read-only consent at the bank, and its accounts, balances and transactions sync here.</>,
        <>Click a chip under the totals, for example “… uncategorized this month · review”, to go straight to what needs fixing.</>,
        <>Click a tile such as <b>Transactions</b>, <b>Budgets</b> or <b>Recurring</b> to open that part. A number on a tile means something is waiting there.</>,
        <>Switch the <b>Cashflow</b> chart between <b>Months</b> and <b>Weeks</b> to see money in and out over time.</>,
        <>Click an account under <b>Accounts</b> or a line under <b>Recent</b> to open it.</>,
      ]}
      tips={[
        <>Sections appear only once they have something to show: budgets after you set one, the map after a store has an address, <b>Portfolio</b> after a depot is linked.</>,
        <>Access is read-only. Nothing can be paid or traded from here.</>,
      ]}
    />
  ),
  insights: (
    <PageHelp
      intro="One period at a glance, compared with another: what you spent, earned and saved, and what changed most."
      steps={[
        <>Open the period button in the header (it starts on <b>This month</b>) and pick <b>Last 3 months</b>, <b>Last 12 months</b> or <b>All time</b>.</>,
        <>In the same menu, under <b>Compare</b>, choose <b>vs. the period before</b>, <b>vs. a year earlier</b> or <b>No comparison</b>.</>,
        <>Read <b>Categories that moved</b> and <b>Merchants that moved</b> to see where spending rose or fell against the comparison period.</>,
        <>Click a merchant, a transaction under <b>Largest transactions</b> or a payment under <b>Recurring payments due</b> to open it.</>,
      ]}
      tips={[
        <><b>Saved</b> is the share of the period’s income that was not spent.</>,
      ]}
    />
  ),
  accounts: (
    <PageHelp
      intro="Every account of your linked banks with its current balance."
      steps={[
        <>Press <b>Link bank</b> to add a bank. Choose <b>Bank account</b>, check the two-letter country code, search for your bank and give consent on the bank’s page. Choose <b>Scalable Capital</b> to link a broker instead.</>,
        <>Click an account to see its balance over time and its transactions.</>,
        <>Right-click an account and choose <b>Sync now</b> to fetch its latest transactions and balance.</>,
      ]}
      tips={[
        <>A spinning arrow on a card means the account is syncing. A warning triangle means the last sync failed or the bank consent ran out.</>,
      ]}
    />
  ),
  account: (
    <PageHelp
      intro="One account: its balance over time and every transaction on it. A depot (a securities account at a broker) shows its positions and their value instead of a balance."
      steps={[
        <>Press <b>Sync now</b> to fetch the latest transactions and balance from the bank.</>,
        <>Switch the chart between <b>30d</b>, <b>90d</b> and <b>1y</b>. On a bank account, turn on <b>Forecast</b> to project the balance ahead from your confirmed recurring payments and budgets.</>,
        <>Type into <b>Search…</b> to find a transaction, and use <b>Filter</b> for <b>Money out</b>, <b>Money in</b>, <b>Uncategorized only</b>, <b>Auto-categorized only</b> or <b>Hide transfers</b>.</>,
        <>Click a category chip under a transaction to categorize it in one click. <b>Keep …</b> confirms a guessed category.</>,
        <>Right-click a transaction for <b>Categorize</b>, <b>Set merchant</b>, <b>Rule from counterparty</b> or <b>Mark as transfer</b>.</>,
        <>On a depot, pick a day in the date field of the header to see the holdings as of that day; <b>back to today</b> returns.</>,
      ]}
      tips={[
        <>The bank limits how often an account may be synced. When <b>Sync now</b> is greyed out, hover it to see when the next sync is allowed; the <b>Info</b> tab shows <b>Syncs left today</b>.</>,
        <>A yellow banner at the top says what is wrong with the account and offers <b>Relink</b> or <b>Log in again</b> when that fixes it.</>,
        <>The <b>Insights</b> tab holds the average, lowest and highest balance, the top categories and merchants, and the largest payments.</>,
      ]}
    />
  ),
  transactions: (
    <PageHelp
      intro="Every booking across all your accounts, newest first. This is the place to review and categorize; the title shows how many match the current search and filter."
      steps={[
        <>Type into <b>Search…</b> to find bookings by who or what they were for.</>,
        <>Open <b>Filter</b> and tick <b>Uncategorized only</b> to see what still needs a category. <b>Auto-categorized only</b> shows the ones that were only guessed.</>,
        <>Click a category chip under a transaction to categorize it in one click. <b>Keep …</b> confirms a guess.</>,
        <>Right-click a transaction and choose <b>Categorize</b> to pick any category, or <b>Set merchant</b> to say who it was with.</>,
        <>Right-click a transaction and choose <b>Rule from counterparty</b> to have every booking from the same sender or recipient categorized the same way.</>,
        <>Open the sort button (<b>Newest</b>) and pick <b>Largest out</b> or <b>Largest in</b> to order by amount.</>,
      ]}
      tips={[
        <>A category you set by hand is never overridden by rules.</>,
        <>Dimmed lines with a clock are pending. Lines with two arrows are transfers between your own accounts; both are left out of spending stats. Use <b>Mark as transfer</b> or <b>Not a transfer</b> in the right-click menu to correct one.</>,
        <>While you search, the list is ordered by <b>Best match</b> unless you pick another order.</>,
      ]}
    />
  ),
  transaction: (
    <PageHelp
      intro="One booking: the amount, the bank’s text, and what it was sorted as (merchant, category, transfer or not)."
      steps={[
        <>Press <b>Categorize</b> to choose a category, or click one of the chips after <b>Suggested</b>.</>,
        <>Press <b>Set merchant</b> to say who the payment was with and, optionally, at which of their stores.</>,
        <>Press <b>Make rule</b> to categorize every booking from this counterparty the same way from now on.</>,
        <>Turn on <b>Transfer between own accounts</b> if this is money you moved yourself, so it does not count as spending or income.</>,
        <>Write into <b>Note</b> and press <b>Save note</b> to keep a remark with the booking.</>,
        <>Open the <b>Similar</b> tab to see bookings like this one and move them to the same category with one button.</>,
      ]}
      tips={[
        <>The small text next to <b>Merchant</b> and <b>Category</b> says where the value came from: set by hand, set by a rule, recognized, or guessed from similar transactions.</>,
        <>In the <b>Categorize</b> dialog, <b>Clear, let rules decide</b> removes a category you set by hand.</>,
      ]}
    />
  ),
  connections: (
    <PageHelp
      intro="A connection is your consent at one bank or broker; it is what allows your accounts there to be read. This page lists them with their status."
      steps={[
        <>Press <b>Link bank</b> to add a connection: pick <b>Bank account</b> or <b>Scalable Capital</b> and follow the login.</>,
        <>Click a connection to see its accounts and when the consent runs out.</>,
        <>Right-click a connection and choose <b>Sync all accounts</b> to fetch everything from that bank now.</>,
        <>Right-click a connection marked <b>Needs relink</b> and choose <b>Relink bank</b> to give consent again. The same accounts and their history are kept.</>,
        <>Right-click and choose <b>Revoke consent</b> to stop syncing a bank, or <b>Cancel login</b> to throw away a login you never finished.</>,
      ]}
      tips={[
        <>Bank consent is temporary; each card shows “consent until” its end date. After that the connection needs a relink.</>,
        <>Revoking keeps the accounts and transactions already synced.</>,
      ]}
    />
  ),
  connection: (
    <PageHelp
      intro="One bank or broker connection: its status, how long the consent lasts, and the accounts it gives access to."
      steps={[
        <>Press <b>Sync all</b> to fetch every account of this bank now. It is shown while the connection is active.</>,
        <>Press <b>Relink</b> (for Scalable Capital: <b>Log in again</b>) to renew the consent. Accounts and history are kept.</>,
        <>If the login was never finished, press <b>Continue login</b> to pick it up, or <b>Cancel</b> to discard it.</>,
        <>Click an account card to open that account.</>,
        <>Open the menu at the right end of the header and choose <b>Revoke consent</b> to stop syncing this bank.</>,
      ]}
      tips={[
        <>The <b>Info</b> tab shows <b>Consent until</b> and <b>Syncs left today</b>. Banks limit how often data may be fetched, so <b>Sync all</b> is greyed out when the limit is reached.</>,
        <>A yellow banner explains a failed sync or an expired consent and offers the button that fixes it.</>,
      ]}
    />
  ),
  categories: (
    <PageHelp
      intro="Categories are how your bookings are sorted, for example Groceries or Rent. This page lists the top-level categories; subcategories are found by opening their parent."
      steps={[
        <>Press <b>Add defaults</b> to start from the standard set of categories.</>,
        <>Press <b>New category</b> to create your own. A <b>Description</b> written in the words your bank lines use helps suggestions find it.</>,
        <>Click a category to see its transactions, subcategories and rules.</>,
        <>Right-click a category and choose <b>Set budget</b> for a monthly limit, or <b>New rule</b> to sort bookings into it automatically.</>,
        <>Right-click and choose <b>Edit category</b> to rename, move or hide it, or <b>Delete category</b> to remove it after seeing what goes with it.</>,
      ]}
      tips={[
        <>A dimmed card with a crossed-out eye is a hidden category: it is left out of pickers, suggestions and automatic sorting.</>,
        <><b>Add defaults</b> only adds the default categories that are missing; it does not touch yours.</>,
      ]}
    />
  ),
  category: (
    <PageHelp
      intro="One category: its subcategories, its budget if it has one, and every transaction sorted into it or into a subcategory."
      steps={[
        <>Open the <b>Candidates</b> tab to see uncategorized bookings that look like they belong here, and press <b>Move all … here</b> to take them in.</>,
        <>Press <b>New rule</b> to sort matching bookings into this category automatically.</>,
        <>Press <b>Set budget</b> to give the category a monthly limit. The button is there while the category has no budget.</>,
        <>Press <b>Add subcategory</b> to split the category further, then drag a transaction onto a subcategory card and choose <b>Move into category</b>.</>,
        <>Press <b>Edit</b> to rename the category, change its description, move it under another parent or hide it.</>,
        <>Use <b>Search…</b>, <b>Filter</b> and the sort button to narrow the transaction list.</>,
      ]}
      tips={[
        <>The <b>Info</b> tab lists the words the category is recognized by. A description in the words your bank lines use helps suggestions and search find it.</>,
        <>The <b>Insights</b> tab shows spending per month and the top merchants; <b>Merchants</b> lists the merchants that default to this category; <b>Rules</b> appears once the category has rules.</>,
      ]}
    />
  ),
  merchants: (
    <PageHelp
      intro="Merchants are the shops and companies you pay, recognized from the text on your bank lines. They are shown on a map of their stores or as a list."
      steps={[
        <>Use the row of tabs to switch between <b>Map</b>, <b>List</b>, <b>Places</b>, <b>Top</b> and <b>Discover</b>.</>,
        <>On the map, click a numbered circle to zoom into a group of stores, and click a dot to see the store, how often you were there and how much you spent.</>,
        <>Open <b>Map settings</b> on the map and turn on <b>Spending heatmap</b> or <b>Stats for this view</b> to see where the money goes in the area on screen.</>,
        <>In <b>List</b>, type into <b>Search merchants…</b> to find one, and click it to open it.</>,
        <>Press <b>New merchant</b> to add one by hand, with the texts (aliases) that mean this merchant on a bank line.</>,
        <>In <b>List</b>, drag a duplicate merchant onto the one to keep and choose <b>Merge into this merchant</b>.</>,
      ]}
      tips={[
        <>Only stores with a known position are on the map. Online-only merchants appear in <b>List</b> only.</>,
        <>Right-click a merchant for <b>Edit merchant</b>, <b>Merge into…</b>, <b>Add place</b> and <b>Delete merchant</b>.</>,
        <>A number on <b>Discover</b> counts recurring counterparties that have no merchant yet.</>,
      ]}
    />
  ),
  merchant: (
    <PageHelp
      intro="One merchant: what you spent there in total, its stores (places) and every transaction with it."
      steps={[
        <>Press <b>Edit</b> to rename the merchant or set its category, website and logo.</>,
        <>Press <b>Add place</b> to add one of its stores with an address.</>,
        <>Click a place in the list, or its pin on the map, to narrow the transactions to that store. Click it again to show all.</>,
        <>Press <b>Locate</b> on a place without a position to look its address up and put it on the map.</>,
        <>In the <b>Info</b> tab, type a text into <b>Add alias…</b> and press <b>Add</b> so bank lines containing it are recognized as this merchant. The × on an alias removes it.</>,
        <>Press <b>Merge into…</b> to fold this merchant into another one when both are the same shop.</>,
      ]}
      tips={[
        <>The <b>Similar</b> tab lists merchants that look alike, which helps to spot duplicates worth merging.</>,
        <>Merging moves the aliases, places and transactions to the other merchant and deletes this one.</>,
        <>The map appears once at least one place has a position.</>,
      ]}
    />
  ),
  places: (
    <PageHelp
      intro="Places are the individual stores of your merchants, with their address and how often you were there."
      steps={[
        <>Press <b>Not on map</b> to show only the places that still have no position.</>,
        <>Click a place to open it, add its address and find it on the map.</>,
        <>Right-click a place and choose <b>Edit place</b> to change its name, address or store number, or <b>Delete place</b> to remove it.</>,
        <>Click the merchant name on a card to open the merchant.</>,
      ]}
      tips={[
        <>Places come from the store numbers on bank lines, or are added by hand from a merchant with <b>Add place</b>.</>,
        <>A pale pin on a card means the place is not on the map yet.</>,
        <>Deleting a place leaves its transactions with the merchant.</>,
      ]}
    />
  ),
  place: (
    <PageHelp
      intro="One store of a merchant: where it is and the transactions that happened there."
      steps={[
        <>Press <b>Edit</b> to set the name, address and store number. In the dialog you can also click the map to set the pin yourself.</>,
        <>Press <b>Find on map</b> to look the place up from its name and address. Once it has a position the button reads <b>Look up again</b>.</>,
        <>Click the merchant box at the top to open the merchant this store belongs to.</>,
        <>Use <b>Search…</b>, <b>Filter</b> and the sort button to narrow <b>Transactions here</b>, and click a category chip to categorize a line.</>,
      ]}
      tips={[
        <>In the <b>Info</b> tab, <b>Position</b> says where the pin came from: from bank lines, looked up on OpenStreetMap, or set by hand.</>,
        <>If the lookup finds nothing, add or correct the address and try again.</>,
      ]}
    />
  ),
  topMerchants: (
    <PageHelp
      intro="Where your money goes, ranked by merchant, over a period you choose."
      steps={[
        <>Open the period button in the header (it starts on <b>Last 3 months</b>) and pick <b>This month</b>, <b>Last 12 months</b> or <b>All time</b>.</>,
        <>Click a merchant in the ranking to open it.</>,
        <>Use the row of tabs to move to <b>Map</b>, <b>List</b>, <b>Places</b> or <b>Discover</b>.</>,
      ]}
      tips={[
        <>Spending that has no merchant yet is one row reading “Not recognized yet — discover merchants”; click it to create the missing merchants.</>,
      ]}
    />
  ),
  discoverMerchants: (
    <PageHelp
      intro="Counterparties that keep appearing on your bank lines without being a known merchant, most frequent first. Each card is a merchant waiting to be created."
      steps={[
        <>Read the sample bank lines on a card to see what the counterparty is.</>,
        <>Press <b>Create merchant</b> to turn it into a merchant. The name is prefilled and can be corrected in the dialog; the card’s transactions are linked to it.</>,
        <>When a card carries a category chip, click it to categorize all of its transactions at once, without creating a merchant.</>,
        <>Press <b>Transactions</b> to see the bookings behind a card first.</>,
      ]}
      tips={[
        <>When the page says every recurring counterparty already has a merchant, there is nothing left to do here.</>,
      ]}
    />
  ),
  portfolio: (
    <PageHelp
      intro="All your depots (securities accounts at a broker) as one portfolio: what it is worth, what you paid for it, and every position."
      steps={[
        <>Press <b>Link Scalable</b> to log in to Scalable Capital. Your positions, trades and payouts then sync here.</>,
        <>Read <b>Value</b>, <b>Cost basis</b> and <b>Unrealized gain</b> at the top: what the portfolio is worth now, what the current positions cost, and the difference.</>,
        <>Look through the table for each security: units held, buy-in price, current price, value, gain and its share of the portfolio.</>,
        <>With more than one depot, click one under <b>Depots</b> to open it and see its trades.</>,
      ]}
      tips={[
        <>A security held in two depots is shown as one line.</>,
        <>Access is read-only. Nothing can be traded from here.</>,
        <><b>Income and costs per year</b> sums payouts such as distributions and interest, and fees and taxes, per year.</>,
      ]}
    />
  ),
  budgets: (
    <PageHelp
      intro="A budget is a monthly spending limit for one category. This page shows, for one month, how much of each budget is used."
      steps={[
        <>Press <b>New budget</b>, pick a category and enter the amount <b>Per month</b>.</>,
        <>Press <b>Earlier</b> and <b>Later</b> to step through past months; the title names the month shown.</>,
        <>Click the amounts on a card (spent / limit) to open the budget and see this month’s transactions that count towards it.</>,
        <>Right-click a budget and choose <b>Delete budget</b> to remove it.</>,
      ]}
      tips={[
        <>A red bar means the budget is exceeded; the card then says by how much.</>,
        <>A budget on a category also counts the spending in its subcategories.</>,
      ]}
    />
  ),
  budget: (
    <PageHelp
      intro="One budget: how much of this month’s limit is used, and the transactions of this month that count towards it."
      steps={[
        <>Read the card for what is spent, the limit, and what is left or over.</>,
        <>Go through <b>This month</b> to see which bookings used the budget, and click one to open it.</>,
        <>Use <b>Search…</b>, <b>Filter</b> and the sort button to narrow the list, for example <b>Largest out</b> to see the biggest expenses first.</>,
        <>Open the menu at the right end of the header and choose <b>Delete budget</b> to remove the budget.</>,
      ]}
      tips={[
        <>Transactions in subcategories of the budget’s category count too.</>,
        <><b>Until</b> reads “open-ended” when the budget has no end month.</>,
      ]}
    />
  ),
  rules: (
    <PageHelp
      intro="Rules sort bookings into categories automatically, for example “counterparty contains billa → Groceries”."
      steps={[
        <>Press <b>New rule</b>, pick the <b>Category</b>, choose what to <b>Match on</b> and how, and type the <b>Pattern</b> to look for.</>,
        <>Leave <b>Apply to existing transactions</b> on in the dialog to sort past bookings too, not only new ones.</>,
        <>Press <b>Reapply rules</b> to run every rule over your existing transactions again.</>,
        <>Click a rule to open it and flip its <b>Active</b> switch, or right-click it and choose <b>Delete rule</b>.</>,
      ]}
      tips={[
        <>Rules never change a transaction you categorized by hand.</>,
        <>The number after # is the priority; a lower number runs first. A dimmed rule marked “off” is inactive.</>,
        <>The quickest way to a rule is from a booking: right-click a transaction and choose <b>Rule from counterparty</b>.</>,
      ]}
    />
  ),
  rule: (
    <PageHelp
      intro="One rule, read as a sentence: when a booking matches the text, it gets the category shown after the arrow."
      steps={[
        <>Flip the <b>Active</b> switch to turn the rule off or on. The rules are then run again over your existing transactions.</>,
        <>Click the category after the arrow to open it.</>,
        <>Open the menu at the right end of the header and choose <b>Delete rule</b> to remove the rule. The transactions it sorted are categorized again without it.</>,
      ]}
      tips={[
        <>Transactions you categorized by hand stay as they are, whatever the rules say.</>,
        <><b>Priority</b> decides which rule wins when several match; a lower number runs first.</>,
      ]}
    />
  ),
  recurring: (
    <PageHelp
      intro="Payments that come back regularly, such as rent, subscriptions and salary, detected from your transactions."
      steps={[
        <>Press <b>Detect</b> to search your transactions for recurring payments. New finds appear under <b>To review</b>.</>,
        <>Right-click a payment under <b>To review</b> and choose <b>Confirm recurring</b> if it is real, or <b>Ignore recurring</b> if it is not.</>,
        <>Click a payment to see every time it occurred and when it is expected next.</>,
        <>Read the summary at the top for what your confirmed payments add up to per month and what is due in the next 30 days.</>,
      ]}
      tips={[
        <>Only confirmed payments count in the balance forecast of an account and in the summary.</>,
        <><b>Missed</b> lists confirmed payments that were expected more than 3 days ago and have not shown up; <b>Price changes</b> lists those whose amount changed.</>,
      ]}
    />
  ),
  recurringPayment: (
    <PageHelp
      intro="One recurring payment: its amount, how often it comes, when it is expected next, and the bookings it was detected from."
      steps={[
        <>Press <b>Confirm</b> to accept it as a real recurring payment, so it counts in balance forecasts.</>,
        <>Press <b>Ignore</b> if it is not really recurring.</>,
        <>Click a booking under <b>Occurrences</b> to open that transaction.</>,
        <>Click the account name next to <b>Account</b> to open the account it is paid from or into.</>,
      ]}
      tips={[
        <><b>Status</b> is detected (found, not yet reviewed), confirmed or ignored. Each button is hidden when the payment already has that status.</>,
      ]}
    />
  ),
};
