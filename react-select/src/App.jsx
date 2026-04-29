import { useState } from 'react';
import { Select, Tag, List, Divider } from 'antd';

const DiseaseSelect = ({ value: propsValue, onChange, type = 'select', mode }) => {
  const [internalValue, setInternalValue] = useState(mode === 'multiple' ? [] : null);
  const [open, setOpen] = useState(false); // 控制下拉框展开/收起
  const [searchValue, setSearchValue] = useState(''); // 搜索关键词
  const [activeCategory, setActiveCategory] = useState(null); // 当前激活的根分类
  const [activeChild, setActiveChild] = useState(null); // 当前激活的一级项（用于展示右侧面板）

  // 使用外部传入的 value 或内部 state
  const value = propsValue !== undefined ? propsValue : internalValue;

  // 模拟数据
  const commonDiseases = ['肺癌', '乳腺癌', '胃癌'];
  const allCategories = [
    {
      name: '肺癌',
      children: [
        { name: '非小细胞肺癌' },
        { name: '小细胞肺癌' }
      ]
    },
    {
      name: '乳腺癌',
      children: [
        { name: '浸润性癌' },
        { name: '导管内癌' }
      ]
    },
    {
      name: '胃癌',
      children: [
        { name: '早期胃癌' },
        { name: '进展期胃癌' }
      ]
    },
    {
      name: '食管癌',
      children: [
        {
          name: '食管癌',
          children: [
            { name: '初诊' },
            { name: '术前辅助治疗中' },
            { name: '术后辅助治疗中' },
            { name: '新辅助治疗中' },
            { name: '手术后' }
          ]
        }
      ]
    }
  ];

  // 检查某个路径是否已被选中
  const checkIsSelected = (targetValue) => {
    if (mode === 'multiple') {
      return Array.isArray(value) && value.some(v => v.value === targetValue);
    }
    return value?.value === targetValue;
  };

  // 处理选项点击：选中 + 关闭下拉
  const handleSelect = (item, pathNodes = []) => {
    // 构造显示标签：如果有路径则拼接，否则显示项名称
    const fullLabel = pathNodes.length > 0
      ? pathNodes.map(n => n.name).join(' / ')
      : (typeof item === 'string' ? item : item.name);

    // 构造返回对象
    const valObj = {
      value: fullLabel, // antd Select labelInValue 模式下需要 value
      label: fullLabel, // 界面回显内容
      pathNodes: pathNodes, // 完整的层级节点数组
      selectedItem: typeof item === 'string' ? { name: item } : item, // 当前选中的原始对象
    };

    if (mode === 'multiple') {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.some(v => v.value === fullLabel);
      let nextValues;

      if (isSelected) {
        nextValues = currentValues.filter(v => v.value !== fullLabel);
      } else {
        nextValues = [...currentValues, valObj];
      }

      if (onChange) onChange(nextValues);
      else setInternalValue(nextValues);

      // 多选模式下通常不自动关闭下拉框
    } else {
      if (onChange) {
        onChange(valObj);
      } else {
        setInternalValue(valObj);
      }

      setOpen(false); // 关键：点击后关闭下拉面板
      setSearchValue(''); // 选中后清空搜索
      setActiveCategory(null);
      setActiveChild(null);
    }
  };

  // 处理搜索
  const handleSearch = (val) => {
    setSearchValue(val);
    setActiveChild(null); // 搜索时重置右侧面板
    setActiveCategory(null);
  };

  // 过滤常见病种
  const filteredCommonDiseases = commonDiseases.filter(disease =>
    disease.toLowerCase().includes(searchValue.toLowerCase())
  );

  // 过滤所有分类（父级、子级或孙级匹配都显示）
  const filteredCategories = allCategories
    .map(category => {
      const parentMatch = category.name.toLowerCase().includes(searchValue.toLowerCase());

      const matchedChildren = category.children.map(child => {
        const childMatch = child.name.toLowerCase().includes(searchValue.toLowerCase());
        const matchedSubChildren = (child.children || []).filter(sub =>
          sub.name.toLowerCase().includes(searchValue.toLowerCase())
        );

        if (childMatch) {
          return { ...child };
        } else if (matchedSubChildren.length > 0) {
          return { ...child, children: matchedSubChildren };
        }
        return null;
      }).filter(Boolean);

      if (parentMatch) {
        return { ...category, children: category.children };
      } else if (matchedChildren.length > 0) {
        return { ...category, children: matchedChildren };
      }
      return null;
    })
    .filter(Boolean); // 过滤掉 null

  // 自定义下拉内容
  const dropdownContent = (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column' }}>
      {/* 1. 常见病种快捷区 */}
      {filteredCommonDiseases.length > 0 && <>
        <div style={{ fontWeight: 'bold', marginBottom: 8, padding: '0 8px' }}>常见病种</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 8px', marginBottom: 8 }}>
          {filteredCommonDiseases.map(d => {
            const isSelected = checkIsSelected(d);
            return (
              <Tag
                key={d}
                onClick={() => handleSelect(d)}
                style={{
                  cursor: 'pointer',
                  color: isSelected ? '#168AEF' : undefined,
                  borderColor: isSelected ? '#168AEF' : undefined,
                }}
              >
                {d}
              </Tag>
            );
          })}
        </div>
      </>}

      {/* 2. 所有分类列表区 */}
      <div style={{ fontWeight: 'bold', marginBottom: 8, padding: '0 8px' }}>所有病种分类</div>
      {filteredCategories.length > 0 ? (
        <div style={{ display: 'flex', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
          {/* 左侧面板：一级 children */}
          <div style={{ flex: 1, borderRight: activeChild ? '1px solid #f0f0f0' : 'none', maxHeight: 300, overflowY: 'auto' }}>
            <List
              size="small"
              dataSource={filteredCategories}
              renderItem={category => (
                <List.Item style={{ flexDirection: 'column', alignItems: 'flex-start', padding: 0, border: 'none' }}>
                  <div style={{ color: '#aaa', padding: '4px 8px' }}>{category.name}</div>
                  <div style={{ width: '100%' }}>
                    {category.children.map(child => {
                      const hasChildren = child.children && child.children.length > 0;
                      const isActive = activeChild === child;
                      const itemLabel = `${category.name} / ${child.name}`;
                      const isItemSelected = checkIsSelected(itemLabel);

                      return (
                        <div
                          key={child.name}
                          onClick={() => {
                            if (hasChildren) {
                              setActiveChild(child);
                              setActiveCategory(category);
                            } else {
                              handleSelect(child, [category, child]);
                            }
                          }}
                          style={{
                            cursor: 'pointer',
                            padding: '6px 16px',
                            backgroundColor: isItemSelected ? '#E9F3FF' : (isActive ? '#e6f4ff' : 'transparent'),
                            color: isItemSelected ? '#168AEF' : (isActive || !hasChildren ? '#333' : '#aaa'),
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive && !isItemSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive && !isItemSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <span>{child.name}</span>
                          {hasChildren && <span style={{ color: isItemSelected ? '#168AEF' : '#bfbfbf', fontSize: 12 }}>{'>'}</span>}
                        </div>
                      )
                    })}
                  </div>
                </List.Item>
              )}
            />
          </div>

          {/* 右侧面板：二级 children */}
          {activeChild && activeChild.children && (
            <div style={{ flex: 1, maxHeight: 300, overflowY: 'auto', padding: '8px 0' }}>
              {activeChild.children.map(subChild => {
                const itemLabel = `${activeCategory.name} / ${activeChild.name} / ${subChild.name}`;
                const isItemSelected = checkIsSelected(itemLabel);

                return (
                  <div
                    key={subChild.name}
                    onClick={() => handleSelect(subChild, [activeCategory, activeChild, subChild])}
                    style={{
                      cursor: 'pointer',
                      padding: '6px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      backgroundColor: isItemSelected ? '#E9F3FF' : 'transparent',
                      color: isItemSelected ? '#168AEF' : '#333',
                    }}
                    onMouseEnter={(e) => {
                      if (!isItemSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      if (!isItemSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {subChild.name}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
          暂无匹配的病种
        </div>
      )}
    </div>
  );

  return (
    <Select
      mode={mode}
      labelInValue
      value={value}
      open={open}
      variant={type === 'text' ? 'borderless' : undefined}
      onChange={(val) => {
        if (onChange) {
          onChange(val);
        } else {
          setInternalValue(val);
        }
      }}
      showSearch
      searchValue={searchValue}
      onSearch={handleSearch}
      popupRender={() => dropdownContent}
      style={{
        width: type === 'text' ? 'auto' : 400,
        color: type === 'text' ? '#168AEF' : undefined,
        fontWeight: type === 'text' ? 'bold' : 'normal'
      }}
      dropdownStyle={{ width: activeChild ? 450 : 250 }}
      popupMatchSelectWidth={false}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) {
          setActiveChild(null);
          setActiveCategory(null);
        }
      }}
      placeholder={type === 'text' ? '请选择' : '选择病种'}
    />
  );
};

const App = () => {
  const [selectedValue, setSelectedValue] = useState(null);
  const [selectedValue2, setSelectedValue2] = useState(null);
  const [selectedValue3, setSelectedValue3] = useState(null);

  return (
    <div style={{ padding: 40 }}>
      <h1>病种选择器演示</h1>

      <div style={{ marginBottom: 40 }}>
        <h3>1. 标准输入框模式 (Controlled)</h3>
        <DiseaseSelect
          value={selectedValue}
          onChange={(val) => {
            console.log('App received:', val);
            setSelectedValue(val);
          }}
        />
        <div style={{ marginTop: 8, color: '#666' }}>
          当前选中: {selectedValue?.label || '无'}
        </div>
      </div>

      <Divider />

      <div style={{ marginBottom: 40 }}>
        <h3>2. 普通文本模式</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>病种：</span>
          <DiseaseSelect
            type="text"
            value={selectedValue2}
            onChange={setSelectedValue2}
          />
        </div>
      </div>


      <div style={{ marginBottom: 40 }}>
        <h3>3. 多选模式</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>病种：</span>
          <DiseaseSelect
            mode='multiple'
            value={selectedValue3}
            onChange={setSelectedValue3}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
