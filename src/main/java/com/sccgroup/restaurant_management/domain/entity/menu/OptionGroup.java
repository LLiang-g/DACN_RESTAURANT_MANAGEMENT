package com.sccgroup.restaurant_management.domain.entity.menu;

import jakarta.persistence.*;

@Entity
@Table(name = "option_group")
public class OptionGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "selection_type")
    private SelectionType selectionType;

    protected OptionGroup() {}

    public OptionGroup(String name, SelectionType selectionType) {
        this.name = name;
        this.selectionType = selectionType;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public SelectionType getSelectionType() { return selectionType; }
    public void setName(String name) { this.name = name; }
    public void setSelectionType(SelectionType selectionType) { this.selectionType = selectionType; }
}