podman build -t my-postgress .
podman run --name my-postgres -e POSTGRES_PASSWORD=mysecretpassword -d postgres
