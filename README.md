# By Iara

## API

Run the API locally:

```bash
cd by-iara-api
./gradlew bootRun
```

Health check:

```bash
curl http://localhost:8080/health
```

Admin login:

```bash
curl -X POST http://localhost:8080/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"ChangeMe123!"}'
```

## Bruno

Open the [bruno](/Users/dylan/Developer/by-iara/bruno) collection in Bruno and select the `Local` environment.
