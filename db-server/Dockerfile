FROM fedora:21

# Install PostgreSQL
RUN yum install -y postgresql-server postgresql-contrib

# Install PostGIS
RUN yum install -y postgis

EXPOSE 5432

ADD admin_boundaries.csv /admin_boundaries.csv
COPY docker-start.sh /start.sh
COPY script /install/script

CMD ["/start.sh"]
