param(
  [string]$CustomerEmail = 'customer1@dummy.tradeconnect.com.au',
  [string]$CustomerPassword = 'DemoPass123!',
  [string]$ProviderEmail = 'plumbing1@dummy.tradeconnect.com.au',
  [string]$ProviderPassword = 'DemoPass123!'
)

$ErrorActionPreference = 'Stop'

function Login($Email, $Password) {
  $body = @{ email = $Email; password = $Password } | ConvertTo-Json
  return Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/auth/login' -ContentType 'application/json' -Body $body
}

$customer = Login $CustomerEmail $CustomerPassword
$provider = Login $ProviderEmail $ProviderPassword

$customerHeaders = @{ Authorization = "Bearer $($customer.access_token)" }
$providerHeaders = @{ Authorization = "Bearer $($provider.access_token)" }

$health = Invoke-RestMethod -Uri 'http://localhost:3000/health'
$webHome = Invoke-WebRequest -UseBasicParsing 'http://localhost:3001/'
$pricing = Invoke-WebRequest -UseBasicParsing 'http://localhost:3001/pricing'
$providerFeed = Invoke-RestMethod -Uri 'http://localhost:3000/api/jobs/feed' -Headers $providerHeaders
$customerJobs = Invoke-RestMethod -Uri 'http://localhost:3000/api/jobs' -Headers $customerHeaders
$directory = Invoke-RestMethod -Uri 'http://localhost:3000/api/profiles/categories/plumbing/providers'

[pscustomobject]@{
  backend_status = $health.status
  web_home_status = $webHome.StatusCode
  web_pricing_status = $pricing.StatusCode
  customer_role = (Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/me' -Headers $customerHeaders).user.role
  provider_role = (Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/me' -Headers $providerHeaders).user.role
  customer_jobs_count = ($customerJobs.jobs | Measure-Object).Count
  provider_feed_count = ($providerFeed.jobs | Measure-Object).Count
  plumbing_directory_count = ($directory.providers | Measure-Object).Count
} | Format-List
