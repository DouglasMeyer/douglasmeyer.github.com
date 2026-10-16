+++
title = "Adding LLM integration to Rails"
description = "Integrating LLM to a rails project to make predictions"
date = 2026-10-16
[taxonomies]
tags = ["projects"]
+++

I've had a feature for *Ledger* conceptulaized for a while, but the barrier to get it implemented seemed to make the feature not worth it. However, with LLM models now widely available, it appears this feature might be an integration away.

## Background

*Ledger* has been a hobby project for a while, and by that I mean it serves as my testing grounds for interesting topics. When I was wanting to try out Angular, Elm, or GraphQL, *Ledger* was the testing grounds, because it had data and was actively being used. I don't always finish these explorations, and that is how we have a Rails project with:

- GraphQL and a custom bulk API endpoints
- Most views in Angular but some in React
- A multi-tenant solution, that can be disabled with an environment variable

That's what *Ledger* *is*, but what does it *do*? It's a zero-sum budgeting application that was written at a time when my family needed a better solution than spreadsheets and good home budgeting options weren't widely available. It allows you to divide your income into accounts, import transactions from your bank, and map what accounts those transactions come out of.
That final step is where LLMs come in, not to automate it, but to make a fair guess and have that as a shortcut to the user.

## What we want

As my family has been using this application for a while, we now have a list of transactions from the bank and what account they map to. So, in the current software scene, my mind went to "let's solve this with AI!" and this might be a case were the tool fits the problem:

> Use an LLM model to find what accounts should match to transactions, and use historical account/transaction mappings as the pattern to follow.

## Taking steps

Now, this is my financial data, so I'm not interested in sending this off to some company, but I do have an [underpowered] ollama server that I can use as a starting point.

With [ollama-ai](https://github.com/gbaptista/ollama-ai), the plan was underway: make a rails service to "autocomplete" the account for a list of transactions (`BankEntry` in the code):

```ruby
require 'ollama-ai'
bank_entries = BankEntry.where(id: command['ids'])
recent_bank_entries = BankEntry.includes(:accounts).limit(50).
  filter{|be| be.amount_remaining == 0}

prompt = <<~PROMPT
  Given this table of recent entries:
  | amount_cents | description | accounts |
  | --- | --- | --- |
  #{recent_bank_entries.map{ |bank_entry|
    [
      bank_entry.amount_cents,
      bank_entry.description,
      bank_entry.account_entries.map(&:account_name).to_json
    ].then { |vals| "| #{ vals.join(' | ') } |" }
  }.join("\n")}

  What would the accounts look like for these entries:
  | id | amount_cents | description |
  | --- | --- | --- |
  #{bank_entries.map{ |bank_entry|
    [
      bank_entry.id,
      bank_entry.amount_cents,
      bank_entry.description
    ].then { |vals| "| #{ vals.join(' | ') } |" }
  }.join("\n")}

  Only respond with JSON, no additional formatting:
  {
    "#{command['ids'].first}": [ "Account" ],
  }
PROMPT

address = "http://192.168.1.1:11434"
# This model seems to work well enough for this case,
# but I'll need to try more options as it still takes a solid minute
model = "hf.co/unsloth/Phi-4-mini-instruct-GGUF:Q4_K_M"
client = Ollama.new(credentials: { address: })

result = client.generate({
  model:, prompt:,
  # No need to stream, I'm only interested in the final result
  stream: false,
  # This really helps some models to not respond with
  # "Here is the JSON ..."
  format: 'json'
})
JSON.parse(result.first['response']) # { "123": [ "Groceries" ] }
```

It worked! Ok, not on my first attempt, it took a few iterations to correctly connect to ollama server (and I changed the gem in the process), but this approach gave me results that seemed to be a fair guess at matching accounts to transactions.

Overall, this feature was quick and fun to add in, and while it works, there are more options to improve on it:

## Next steps

Still, there are some changes that would be good to try:
1. The account names read nice, but there are some cases where the name could confuse the model. It is worth trying to give it the account's ids (and this might save on tokens/time as well).
2. There are lots of models to try out, or choose different quantization levels, or tweak the model's context length. There are a lot of LLM model/options to play with.
3. In my setup, this is an expensive operation (takes just over a minute). I do cache the result, and try to warm the cache before this service is called. However it would probably be best to get a faster ollama server.

The real code is up on github [DouglasMeyer/ledger](https://github.com/DouglasMeyer/ledger/blob/54b89625ad4206f32c681004ed6f0d739bee0e8d/app/controllers/api/bank_entry_autocomplete_v1.rb)
