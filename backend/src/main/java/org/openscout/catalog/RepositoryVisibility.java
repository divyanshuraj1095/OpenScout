package org.openscout.catalog;

/** Requires a fresh upstream public repository matching this immutable GitHub ID. */
public interface RepositoryVisibility {
    void requirePublic(long id);
}
